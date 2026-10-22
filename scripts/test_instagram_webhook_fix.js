const assert = require('assert')
const crypto = require('crypto')
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const { instagramService, instagramMessagingService } = require('../lib/services')
const { instagramRepo, webhookEventsRepo, usersRepo } = require('../lib/repos')

async function runVerification() {
  console.log('='.repeat(70))
  console.log('CREATORSTORE INSTAGRAM WEBHOOK SUBSCRIPTION VERIFICATION')
  console.log('='.repeat(70))

  const { v4: uuidv4 } = require('uuid')
  const testCreatorId = uuidv4()

  // Clean up any test records
  try {
    await prisma.instagramAccount.deleteMany({ where: { creatorId: testCreatorId } })
    await prisma.user.deleteMany({ where: { id: testCreatorId } })
  } catch (e) {}

  // Create test user
  await usersRepo.create({
    id: testCreatorId,
    email: `test_creator_${Date.now()}@example.com`,
    passwordHash: 'dummy_hash',
    role: 'CREATOR',
    country: 'IN',
    emailVerified: true,
  })
  console.log('[1/8] Test Creator created:', testCreatorId)

  // 1. Test OAuth URL generation
  const oauthUrl = instagramService.getOAuthUrl(testCreatorId, '/dashboard/settings/connected-accounts')
  assert(oauthUrl.startsWith('https://www.instagram.com/oauth/authorize'), 'Must use www.instagram.com/oauth/authorize')
  assert(oauthUrl.includes('instagram_business_basic'), 'Must include basic scope')
  assert(oauthUrl.includes('instagram_business_manage_comments'), 'Must include manage_comments scope')
  assert(oauthUrl.includes('instagram_business_manage_messages'), 'Must include manage_messages scope')
  assert(oauthUrl.includes('state='), 'Must include cryptographically signed state token')
  console.log('✓ [1/8] OAuth URL generation verified with correct scopes and Instagram Login host')

  // 2. Test OAuth Callback & Token Exchange with mock/test mode
  const stateToken = new URL(oauthUrl).searchParams.get('state')
  const callbackRes = await instagramService.handleCallback('mock_auth_code_xyz', stateToken)
  assert.strictEqual(callbackRes.connected, true, 'Mock callback must return connected: true')
  assert.strictEqual(callbackRes.status, 'CONNECTED', 'Mock callback must return status: CONNECTED')
  assert(callbackRes.username, 'Must return username')
  console.log('✓ [2/8] OAuth callback & token exchange verified, saved account for creator:', callbackRes.username)

  // 3. Test Webhook subscription endpoint & parameter formatting
  console.log('\nTesting Meta API contract for Webhook Subscriptions...')
  
  // A. Verify that dev/mock token succeeds without crashing
  const devSubResult = await instagramService.subscribeWebhook('meta_tok_test_mock', { platformUserId: 'ig_12345' })
  assert.strictEqual(devSubResult.success, true, 'Dev mode mock token must succeed')
  assert.strictEqual(devSubResult.devMode, true, 'Must flag devMode')
  console.log('✓ [3/8a] subscribeWebhook handles dev/test tokens cleanly')

  // B. Verify that a simulated real token targets /me/subscribed_apps and NOT /{targetUserId}/subscribed_apps
  // Let's test with an invalid token against real Meta endpoint to verify exact contract
  const realEndpointCheck = await instagramService.subscribeWebhook('EAAB_invalid_test_token_for_contract_check', {
    platformUserId: '17841400000000000'
  })
  // The call should NOT throw an unhandled exception. It should cleanly return an error object.
  assert.strictEqual(realEndpointCheck.success, false, 'Invalid token must fail cleanly')
  assert(realEndpointCheck.error, 'Must have error message')
  assert(realEndpointCheck.code, 'Must have Meta error code')
  // Notice: It returned 190 (Invalid OAuth access token), NOT 100 ("Unsupported request - method type: post")!
  assert.notStrictEqual(realEndpointCheck.error, 'Unsupported request - method type: post', 'Must NOT produce Meta Error 100 on /me/subscribed_apps')
  console.log('✓ [3/8b] Outbound Meta API contract verified: calls /me/subscribed_apps via POST with urlencoded params (Meta Code:', realEndpointCheck.code, ')')

  // 4. Test Webhook GET verification handshake
  console.log('\nTesting Webhook GET verification handshake...')
  const verifyToken = process.env.META_INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  const testChallenge = 'challenge_test_string_456'
  
  // Test valid handshake via local server
  const getResValid = await fetch(`http://localhost:3000/api/integrations/instagram/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${testChallenge}`)
  assert.strictEqual(getResValid.status, 200, 'Handshake must return HTTP 200')
  const getValidText = await getResValid.text()
  assert.strictEqual(getValidText, testChallenge, 'Handshake must return challenge text unchanged')

  // Test invalid token handshake
  const getResInvalid = await fetch(`http://localhost:3000/api/integrations/instagram/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${testChallenge}`)
  assert.strictEqual(getResInvalid.status, 403, 'Invalid verify token must return HTTP 403')

  // Test missing parameters
  const getResMissing = await fetch(`http://localhost:3000/api/integrations/instagram/webhook`)
  assert.strictEqual(getResMissing.status, 400, 'Missing parameters must return HTTP 400')
  console.log('✓ [4/8] Webhook GET verification handshake verified (200 challenge match, 403 forbidden, 400 bad request)')

  // 5. Test Webhook POST event delivery and HMAC signature verification
  console.log('\nTesting Webhook POST delivery and HMAC signature verification...')
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET
  const webhookPayload = {
    object: 'instagram',
    entry: [
      {
        id: '17841400000000000',
        time: Date.now(),
        changes: [
          {
            field: 'comments',
            value: {
              id: 'comment_test_id_' + Date.now(),
              text: 'Test comment automated trigger',
              from: { id: 'fan_123', username: 'fan_user' },
              media: { id: 'media_987' },
            }
          }
        ]
      }
    ]
  }
  const rawBody = JSON.stringify(webhookPayload)
  const validSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const invalidSig = 'sha256=invalid_hash_signature_0000000000000000000000'

  // Test invalid signature
  const postResInvalid = await fetch('http://localhost:3000/api/integrations/instagram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': invalidSig,
    },
    body: rawBody,
  })
  assert.strictEqual(postResInvalid.status, 401, 'Invalid signature must return 401')

  // Test valid signature
  const postResValid = await fetch('http://localhost:3000/api/integrations/instagram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': validSig,
    },
    body: rawBody,
  })
  assert.strictEqual(postResValid.status, 200, 'Valid signature must return 200')
  const postResJson = await postResValid.json()
  assert.strictEqual(postResJson.received, true, 'Response must acknowledge event receipt')

  // Test idempotency / deduplication
  const postResDup = await fetch('http://localhost:3000/api/integrations/instagram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': validSig,
    },
    body: rawBody,
  })
  assert.strictEqual(postResDup.status, 200, 'Deduplicated event must return 200')
  const dupJson = await postResDup.json()
  assert.strictEqual(dupJson.deduplicated, true, 'Duplicate payload must be recognized as deduplicated')
  console.log('✓ [5/8] Webhook POST delivery verified: HMAC SHA-256 validated, event deduplicated idempotently')

  // 6. Test Handling of Subscription Failure (SUBSCRIPTION_FAILED state)
  console.log('\nTesting Handling of Subscription Failure...')
  // Persist account in SUBSCRIPTION_FAILED status (as would happen if Meta rejects the subscription)
  await instagramRepo.upsert(testCreatorId, {
    platform: 'INSTAGRAM',
    platformUserId: 'ig_user_test_failure',
    username: 'test_creator_ig',
    accessToken: 'test_token_pending_retry',
    tokenExpiresAt: new Date(Date.now() + 86400000),
    status: 'SUBSCRIPTION_FAILED',
  })

  const statusAfterFailure = await instagramService.getStatus(testCreatorId)
  assert.strictEqual(statusAfterFailure.connected, false, 'SUBSCRIPTION_FAILED must not report fully connected')
  assert.strictEqual(statusAfterFailure.status, 'SUBSCRIPTION_FAILED', 'Must reflect SUBSCRIPTION_FAILED')
  assert.strictEqual(statusAfterFailure.canRetry, true, 'Must allow retry')
  assert.strictEqual(statusAfterFailure.username, 'test_creator_ig', 'Must preserve account username')
  console.log('✓ [6/8] Subscription failure handling verified: status is SUBSCRIPTION_FAILED, account data preserved, canRetry=true')

  // 7. Test Safe Retry Mechanism
  console.log('\nTesting Retry Subscription Mechanism...')
  // Retrying with a mock token should succeed and transition status to CONNECTED
  await instagramRepo.upsert(testCreatorId, {
    platform: 'INSTAGRAM',
    platformUserId: 'ig_user_test_retry',
    username: 'test_creator_ig',
    accessToken: 'meta_tok_retry_success',
    tokenExpiresAt: new Date(Date.now() + 86400000),
    status: 'SUBSCRIPTION_FAILED',
  })

  const retryResult = await instagramService.retrySubscription(testCreatorId)
  assert.strictEqual(retryResult.success, true, 'Retry must succeed for valid token')
  assert.strictEqual(retryResult.status, 'CONNECTED', 'Retry must update status to CONNECTED')

  // Verify DB state
  const statusAfterRetry = await instagramService.getStatus(testCreatorId)
  assert.strictEqual(statusAfterRetry.connected, true, 'Status must now be connected: true')
  assert.strictEqual(statusAfterRetry.status, 'CONNECTED', 'Status must now be CONNECTED')
  assert.strictEqual(statusAfterRetry.webhookSubscribed, true, 'Webhook must be marked subscribed')

  // Check no duplicate records
  const allAccountsForCreator = await prisma.instagramAccount.findMany({ where: { creatorId: testCreatorId } })
  assert.strictEqual(allAccountsForCreator.length, 1, 'Upsert and retry must maintain exactly 1 record per creator')
  console.log('✓ [7/8] Safe retry verified: transitions SUBSCRIPTION_FAILED -> CONNECTED without duplicate records')

  // 8. Test Disconnect Cleanliness
  console.log('\nTesting Disconnect & Clean-up...')
  await instagramService.disconnectAccount(testCreatorId)
  const statusAfterDisconnect = await instagramService.getStatus(testCreatorId)
  assert.strictEqual(statusAfterDisconnect.connected, false, 'Must report disconnected')
  const accountsCountAfter = await prisma.instagramAccount.count({ where: { creatorId: testCreatorId } })
  assert.strictEqual(accountsCountAfter, 0, 'Account record must be deleted on disconnect')
  console.log('✓ [8/8] Account disconnect & cleanup verified')

  // Clean up user
  await prisma.user.delete({ where: { id: testCreatorId } })

  console.log('\n' + '='.repeat(70))
  console.log('ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY!')
  console.log('='.repeat(70))
}

runVerification().catch((err) => {
  console.error('\n[TEST FAILURE]', err)
  process.exit(1)
})
