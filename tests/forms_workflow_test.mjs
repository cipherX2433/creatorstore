import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { formsRepo, storesRepo, usersRepo } from '../lib/repos.js'
import { formsService } from '../lib/services.js'
import { OTHER_PRIMARY_NAV, MORE_MENU_CATEGORIES } from '../lib/navigationConfig.js'

async function runTests() {
  console.log('--- STARTING COMPLETE FORMS WORKFLOW TEST SUITE ---')

  // 1. Navigation Configuration Tests
  console.log('\n[1/7] Testing Navigation Configuration...')
  const formsPrimaryNav = OTHER_PRIMARY_NAV.find((item) => item.href === '/dashboard/forms')
  assert.ok(formsPrimaryNav, 'Forms & Responses must exist in OTHER_PRIMARY_NAV')
  assert.equal(formsPrimaryNav.label, 'Forms & Responses')
  console.log('✓ Forms & Responses link confirmed in OTHER_PRIMARY_NAV')

  const toolsCategory = MORE_MENU_CATEGORIES.find((cat) => cat.id === 'tools')
  assert.ok(toolsCategory, 'Tools category must exist in MORE_MENU_CATEGORIES')
  const formsMoreItem = toolsCategory.items.find((item) => item.href === '/dashboard/forms')
  assert.ok(formsMoreItem, 'Forms & Responses must exist in mobile MORE_MENU_CATEGORIES')
  console.log('✓ Forms & Responses link confirmed in mobile MORE_MENU_CATEGORIES')

  // 2. UI Code Audit: Ensure Black Backgrounds are Removed
  console.log('\n[2/7] Auditing UI Simplification in AddFormConfig.jsx...')
  const addFormConfigCode = fs.readFileSync(
    path.join(process.cwd(), 'components/dashboard/AddFormConfig.jsx'),
    'utf-8'
  )
  assert.ok(!addFormConfigCode.includes('bg-[#1A1A1A]'), 'Black header banner bg-[#1A1A1A] must be removed')
  assert.ok(!addFormConfigCode.includes('bg-[#232323]'), 'Black fields section bg-[#232323] must be removed')
  assert.ok(!addFormConfigCode.includes('bg-[#2A2A2A] text-white'), 'Dark field chips must be replaced with neutral chips')
  assert.ok(addFormConfigCode.includes('Switch'), 'AddFormConfig must support settings switches')
  assert.ok(addFormConfigCode.includes('Included Form Fields') || addFormConfigCode.includes('Included fields'), 'Included fields must be present')
  console.log('✓ AddFormConfig has no black surfaces, uses clean light styling & form-specific toggles')

  // Audit StorefrontFormCard.jsx: Ensure Real API Submission
  console.log('\n[3/7] Auditing StorefrontFormCard.jsx...')
  const storefrontCardCode = fs.readFileSync(
    path.join(process.cwd(), 'components/storefront/StorefrontFormCard.jsx'),
    'utf-8'
  )
  assert.ok(storefrontCardCode.includes('/api/public/forms/submit'), 'StorefrontFormCard must call /api/public/forms/submit')
  assert.ok(!storefrontCardCode.includes('setTimeout(() => {'), 'StorefrontFormCard must not use fake setTimeout submissions')
  assert.ok(storefrontCardCode.includes('getAccessibleTextColor'), 'StorefrontFormCard must use accessible button text contrast')
  console.log('✓ StorefrontFormCard calls live API and enforces theme contrast')

  // Audit app/dashboard/forms/page.js
  assert.ok(fs.existsSync(path.join(process.cwd(), 'app/dashboard/forms/page.js')), 'Dashboard page app/dashboard/forms/page.js must exist')
  const formsDashboardCode = fs.readFileSync(
    path.join(process.cwd(), 'app/dashboard/forms/page.js'),
    'utf-8'
  )
  assert.ok(formsDashboardCode.includes('Submissions Inbox'), 'Dashboard must have Submissions Inbox tab')
  assert.ok(formsDashboardCode.includes('Forms Overview'), 'Dashboard must have Forms Overview tab')
  assert.ok(formsDashboardCode.includes('Newsletter Subscribers'), 'Dashboard must have Newsletter Subscribers tab')
  console.log('✓ Dedicated Forms & Responses dashboard page exists with all 3 core tabs')

  // 3. Database & Repository Testing: Test Users Setup
  console.log('\n[4/7] Setting up Test Creators & Stores in Database...')
  const testEmailA = `test_creator_forms_a_${Date.now()}@example.com`
  const testEmailB = `test_creator_forms_b_${Date.now()}@example.com`
  const usernameA = `forms_store_a_${Date.now()}`
  const usernameB = `forms_store_b_${Date.now()}`

  const userA = await prisma.user.create({
    data: {
      email: testEmailA,
      role: 'CREATOR',
      passwordHash: 'dummy_hash',
      emailVerified: true,
    },
  })

  const userB = await prisma.user.create({
    data: {
      email: testEmailB,
      role: 'CREATOR',
      passwordHash: 'dummy_hash',
      emailVerified: true,
    },
  })

  // Ensure stores are published
  const storeA = await prisma.store.create({
    data: {
      creatorId: userA.id,
      username: usernameA,
      slug: usernameA,
      storeName: 'Store A',
      published: true,
    },
  })

  const storeB = await prisma.store.create({
    data: {
      creatorId: userB.id,
      username: usernameB,
      slug: usernameB,
      storeName: 'Store B',
      published: true,
    },
  })

  console.log(`✓ Test creators created: userA=${userA.id}, userB=${userB.id}`)

  // 4. Test Creation & Configuration Persistence for All 4 Form Types
  console.log('\n[5/7] Testing Form Creation & Persistence for All 4 Types...')

  // 4a. Contact Form
  const contactForm = await formsService.createForm(userA.id, {
    formType: 'contact',
    title: 'Contact Us Test',
    description: 'Send us your inquiries',
    buttonText: 'Send Message',
    successMessage: 'We received your contact inquiry!',
    notificationEmail: 'creator_contact_alerts@example.com',
    status: 'PUBLISHED',
    settings: { requireName: true, includePhone: true },
    addToStore: false,
  })
  assert.ok(contactForm.id, 'Contact form must have an ID')
  assert.equal(contactForm.formType, 'contact')
  assert.equal(contactForm.notificationEmail, 'creator_contact_alerts@example.com')
  console.log('✓ Contact form created and verified')

  // 4b. Feedback Form
  const feedbackForm = await formsService.createForm(userA.id, {
    formType: 'feedback',
    title: 'Client Review Test',
    description: 'Rate our service',
    buttonText: 'Submit Review',
    successMessage: 'Thanks for reviewing!',
    status: 'PUBLISHED',
    settings: { ratingStyle: 'five_star', requireComment: true },
    addToStore: false,
  })
  assert.ok(feedbackForm.id, 'Feedback form must have an ID')
  assert.equal(feedbackForm.formType, 'feedback')
  console.log('✓ Feedback form created and verified')

  // 4c. Newsletter Signup Form
  const newsletterForm = await formsService.createForm(userA.id, {
    formType: 'newsletter',
    title: 'Weekly Drops Test',
    description: 'Get weekly updates',
    buttonText: 'Join List',
    successMessage: 'Welcome to the newsletter!',
    status: 'PUBLISHED',
    settings: { includeName: true, requireConsent: true, consentText: 'I agree to marketing emails' },
    addToStore: false,
  })
  assert.ok(newsletterForm.id, 'Newsletter form must have an ID')
  assert.equal(newsletterForm.formType, 'newsletter')
  console.log('✓ Newsletter signup form created and verified')

  // 4d. Q&A / Ask Me Anything Form
  const qaForm = await formsService.createForm(userA.id, {
    formType: 'qa',
    title: 'Ask Me Anything Test',
    description: 'Ask any questions',
    buttonText: 'Submit AMA',
    successMessage: 'Question received!',
    status: 'PUBLISHED',
    settings: { allowAnonymous: true, requireApproval: true },
    addToStore: false,
  })
  assert.ok(qaForm.id, 'Q&A form must have an ID')
  assert.equal(qaForm.formType, 'qa')
  console.log('✓ Q&A form created and verified')

  // Verify listForms
  const creatorForms = await formsService.listForms(userA.id)
  assert.equal(creatorForms.length, 4, 'Creator A should have 4 forms')
  console.log('✓ listForms returns all 4 created forms')

  // 5. Test Public Form Submissions & Storage
  console.log('\n[6/7] Testing Public Form Submissions & Database Storage...')

  // 5a. Contact Form Submission
  const contactSubmission = await formsService.submitPublicForm({
    formId: contactForm.id,
    formType: 'contact',
    name: 'Alice Visitor',
    email: 'alice@example.com',
    message: 'Hello, I want to collaborate on a digital project!',
    answers: { phone: '+123456789' },
  }, '127.0.0.1')
  assert.ok(contactSubmission.success, 'Contact submission should succeed')
  assert.equal(contactSubmission.submission.name, 'Alice Visitor')
  assert.equal(contactSubmission.submission.email, 'alice@example.com')
  assert.equal(contactSubmission.submission.isRead, false, 'New submission should be unread')
  console.log('✓ Contact form public submission persisted with unread state')

  // 5b. Feedback Form Submission (5-Star Rating Validation)
  const feedbackSubmission = await formsService.submitPublicForm({
    formId: feedbackForm.id,
    formType: 'feedback',
    name: 'Bob Client',
    email: 'bob@example.com',
    rating: 5,
    message: 'Incredible courses and resources, highly recommended!',
  }, '127.0.0.1')
  assert.ok(feedbackSubmission.success, 'Feedback submission should succeed')
  assert.equal(feedbackSubmission.submission.rating, 5)
  console.log('✓ Feedback form public submission persisted with 5-star rating')

  // Test invalid rating rejection
  let ratingErrorCaught = false
  try {
    await formsService.submitPublicForm({
      formId: feedbackForm.id,
      formType: 'feedback',
      rating: 10, // Invalid, max is 5
      message: 'Invalid rating',
    })
  } catch (err) {
    ratingErrorCaught = true
  }
  assert.ok(ratingErrorCaught, 'Submission with rating > 5 should be rejected')
  console.log('✓ Invalid rating properly rejected by server-side validation')

  // 5c. Newsletter Form Submission & Duplicate Handling
  const newsletterSub1 = await formsService.submitPublicForm({
    formId: newsletterForm.id,
    formType: 'newsletter',
    name: 'Charlie Subscriber',
    email: 'charlie@example.com',
    consent: true,
  }, '127.0.0.1')
  assert.ok(newsletterSub1.success, 'Newsletter submission should succeed')

  // Check subscriber record in database
  const subscribersA = await formsService.listSubscribers(userA.id)
  assert.equal(subscribersA.items.length, 1)
  assert.equal(subscribersA.items[0].email, 'charlie@example.com')
  assert.equal(subscribersA.items[0].status, 'SUBSCRIBED')
  assert.equal(subscribersA.items[0].consentGiven, true)

  // Test duplicate email subscription: should not create duplicate subscriber record
  await formsService.submitPublicForm({
    formId: newsletterForm.id,
    formType: 'newsletter',
    name: 'Charlie Updated Name',
    email: 'charlie@example.com',
    consent: true,
  }, '127.0.0.1')
  const subscribersAfterDup = await formsService.listSubscribers(userA.id)
  assert.equal(subscribersAfterDup.items.length, 1, 'Duplicate email must update existing record without duplicating')
  console.log('✓ Newsletter subscription creates subscriber record and handles duplicates gracefully')

  // Test Newsletter Unsubscribe
  const unsubResult = await formsRepo.unsubscribeNewsletter(userA.id, 'charlie@example.com')
  assert.ok(unsubResult.success, 'Unsubscribe should succeed')
  const subscribersAfterUnsub = await formsService.listSubscribers(userA.id)
  assert.equal(subscribersAfterUnsub.items[0].status, 'UNSUBSCRIBED')
  console.log('✓ Newsletter unsubscribe works correctly')

  // 5d. Q&A Form Submission (Private by default with moderation)
  const qaSubmission = await formsService.submitPublicForm({
    formId: qaForm.id,
    formType: 'qa',
    message: 'What camera setup do you use for your course recordings?',
    name: 'Anonymous Creator',
  }, '127.0.0.1')
  assert.ok(qaSubmission.success, 'Q&A submission should succeed')
  assert.equal(qaSubmission.submission.status, 'PENDING', 'Q&A question is stored with PENDING moderation status')
  console.log('✓ Q&A submission stored privately with moderation tracking')

  // 5e. Rejection of Submissions to Draft/Unpublished Forms
  await formsService.updateForm(contactForm.id, userA.id, { status: 'DRAFT' })
  let draftErrorCaught = false
  try {
    await formsService.submitPublicForm({
      formId: contactForm.id,
      name: 'Tester',
      email: 'test@example.com',
      message: 'Should fail',
    })
  } catch (err) {
    draftErrorCaught = true
  }
  assert.ok(draftErrorCaught, 'Submissions to DRAFT forms must be rejected')
  console.log('✓ Submissions to DRAFT forms properly rejected')

  // Restore status to PUBLISHED
  await formsService.updateForm(contactForm.id, userA.id, { status: 'PUBLISHED' })

  // 6. Creator Response Management & Authorization Checks
  console.log('\n[7/7] Testing Response Management & Creator Ownership Security...')

  // Check unread count
  const unreadData = await formsService.getUnreadCount(userA.id)
  assert.ok(unreadData.unreadCount >= 3, 'Creator A should have at least 3 unread submissions')

  // Mark submission as read
  const markReadRes = await formsService.markSubmissionRead(contactSubmission.submission.id, userA.id, true)
  assert.ok(markReadRes.success)
  const subAfterRead = await formsService.getSubmission(contactSubmission.submission.id, userA.id)
  assert.equal(subAfterRead.isRead, true, 'Submission isRead should now be true')

  // Mark all as read
  await formsService.markAllRead(userA.id)
  const unreadAfterMarkAll = await formsService.getUnreadCount(userA.id)
  assert.equal(unreadAfterMarkAll.unreadCount, 0, 'Unread count should be 0 after markAllRead')
  console.log('✓ Read/unread response management verified')

  // Authorization Security Check: Creator B CANNOT see Creator A's forms or submissions
  const formsB = await formsService.listForms(userB.id)
  assert.equal(formsB.length, 0, 'Creator B must not see any of Creator A’s forms')

  const submissionsB = await formsService.listSubmissions(userB.id)
  assert.equal(submissionsB.items.length, 0, 'Creator B must not see any of Creator A’s submissions')

  let idorCaught = false
  try {
    // Creator B trying to access Creator A's submission directly
    await formsService.getSubmission(contactSubmission.submission.id, userB.id)
  } catch (err) {
    idorCaught = true
  }
  assert.ok(idorCaught, 'Direct access to another creator’s submission must be denied (404/401)')
  console.log('✓ Multi-tenant authorization security confirmed (IDOR protected)')

  // Clean up test data
  console.log('\nCleaning up test artifacts...')
  await prisma.formSubmission.deleteMany({ where: { creatorId: { in: [userA.id, userB.id] } } })
  await prisma.newsletterSubscriber.deleteMany({ where: { creatorId: { in: [userA.id, userB.id] } } })
  await prisma.form.deleteMany({ where: { creatorId: { in: [userA.id, userB.id] } } })
  await prisma.store.deleteMany({ where: { creatorId: { in: [userA.id, userB.id] } } })
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })

  console.log('\n======================================================')
  console.log('  ALL FORMS WORKFLOW TESTS PASSED SUCCESSFULLY! (7/7)')
  console.log('======================================================\n')
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err)
  process.exit(1)
})
