import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { SUPPORT_EMAIL, TRANSACTIONAL_SENDER_EMAIL } from '../config/site.js'
import { emailService } from '../lib/email.js'
import * as templates from '../lib/emailTemplates.js'

console.log('======================================================================')
console.log('CREATORSTORE — CUSTOMER SUPPORT EMAIL CENTRALIZATION TEST SUITE')
console.log('======================================================================\n')

console.log('▶ TEST 1: Centralized Site Configuration')
assert.strictEqual(SUPPORT_EMAIL, 'support@creatorstore.store', 'SUPPORT_EMAIL must be support@creatorstore.store')
assert.strictEqual(TRANSACTIONAL_SENDER_EMAIL, 'noreply@creatorstore.store', 'TRANSACTIONAL_SENDER_EMAIL must be noreply@creatorstore.store')
console.log('   ✅ Centralized site configuration verified: SUPPORT_EMAIL =', SUPPORT_EMAIL)

console.log('▶ TEST 2: Transactional Sender & Reply-To Distinction')
assert(emailService.from.includes('noreply@creatorstore.store'), 'Sender from must contain noreply@creatorstore.store')
assert.strictEqual(emailService.replyTo, 'support@creatorstore.store', 'Sender replyTo must default to support@creatorstore.store')
console.log('   ✅ Email service configuration verified: From =', emailService.from, '| Reply-To =', emailService.replyTo)

console.log('▶ TEST 3: Transactional Email Templates Support Footer')
const testTmpl = templates.verificationEmailTemplate({ name: 'Alex', otp: '123456' })
assert(testTmpl.html.includes('mailto:support@creatorstore.store'), 'Email template HTML must contain mailto:support@creatorstore.store in footer')
assert(testTmpl.html.includes('support@creatorstore.store'), 'Email template HTML must display support@creatorstore.store')
console.log('   ✅ Transactional email template footer verified with support contact')

console.log('▶ TEST 4: Customer-Facing Legal & Contact Pages')
const filesToCheck = [
  'app/contact/page.js',
  'app/refund/page.js',
  'app/shipping/page.js',
  'app/privacy/page.js',
  'app/terms/page.js',
  'app/data-deletion/page.js',
  'components/landing/FaqSection.jsx',
]

for (const relPath of filesToCheck) {
  const fullPath = path.join(process.cwd(), relPath)
  const content = fs.readFileSync(fullPath, 'utf8')
  assert(content.includes('SUPPORT_EMAIL'), `${relPath} must import/use SUPPORT_EMAIL`)
  assert(!content.includes('meerasingh.ms3333@gmail.com'), `${relPath} must NOT contain old email address`)
  console.log(`   ✅ ${relPath} verified`)
}

console.log('\n======================================================================')
console.log('🎉 ALL SUPPORT EMAIL CENTRALIZATION TESTS PASSED SUCCESSFULLY!')
console.log('======================================================================')
