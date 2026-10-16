const path = require('path')
const fs = require('fs')
try {
  const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  envRaw.split('\n').forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) {
      const key = m[1]
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  })
} catch {}

const crypto = require('crypto')
const { supabaseAdmin } = require('../lib/supabase')

const uuid = () => crypto.randomUUID()
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `${salt}:${derived}`
}
function daysAgo(n) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString() }

async function main() {
  const CREATOR_ID = 'demo-creator-0001'
  const email = 'demo@creatorzero.com'

  // Clean previous demo data
  await Promise.all([
    supabaseAdmin.from('users').delete().eq('id', CREATOR_ID),
    supabaseAdmin.from('creator_profiles').delete().eq('creatorId', CREATOR_ID),
    supabaseAdmin.from('stores').delete().eq('creatorId', CREATOR_ID),
    supabaseAdmin.from('products').delete().eq('creatorId', CREATOR_ID),
    supabaseAdmin.from('customers').delete().eq('creatorId', CREATOR_ID),
    supabaseAdmin.from('orders').delete().eq('creatorId', CREATOR_ID),
    supabaseAdmin.from('entitlements').delete().eq('creatorId', CREATOR_ID),
    supabaseAdmin.from('analytics_events').delete().eq('creatorId', CREATOR_ID),
  ])

  // User + profile
  await supabaseAdmin.from('users').insert({ id: CREATOR_ID, email, passwordHash: hashPassword('demo1234'), role: 'CREATOR', createdAt: daysAgo(40), updatedAt: new Date().toISOString() })
  await supabaseAdmin.from('creator_profiles').insert({
    creatorId: CREATOR_ID, name: 'Mohit Sharma', bio: 'Helping developers ace coding interviews. 200k+ community across YouTube & Instagram.',
    category: 'Coding', avatarUrl: 'https://images.unsplash.com/photo-1555728750-9c6ad51b968d?w=300&q=80',
    socialLinks: { youtube: 'https://youtube.com', instagram: 'https://instagram.com', x: 'https://x.com' },
    onboardingComplete: true, createdAt: daysAgo(40), updatedAt: new Date().toISOString(),
  })

  // Upload private file to Supabase Storage
  async function upload(name, content) {
    const fileId = `seed_${Date.now()}_${name}`
    await supabaseAdmin.storage.from('product-files').upload(fileId, Buffer.from(content), { contentType: 'text/plain' })
    return fileId
  }
  const roadmapFile = await upload('dsa-roadmap.txt', 'DSA ROADMAP\n\n1. Arrays & Strings\n2. Hashing\n3. Two Pointers\n4. Trees & Graphs\n5. DP\n\nGood luck! — Mohit')
  const courseFile = await upload('course-access.txt', 'Welcome to the DSA Interview Course! Your lessons unlock inside your account.')
  const resumeFile = await upload('resume-guide.txt', 'Resume Review Kit — checklist + template included.')

  const products = [
    { title: 'Free DSA Roadmap', short: 'A step-by-step roadmap to master data structures.', price: 0, thumb: 'https://images.unsplash.com/photo-1609895720459-394a6a8c99ed?w=600&q=80', file: roadmapFile, fileName: 'dsa-roadmap.txt', benefits: ['12-week study plan', 'Curated problem list', 'Interview tips'] },
    { title: 'DSA Interview Course', short: 'Land your dream job with 40+ hours of content.', price: 49, thumb: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80', file: courseFile, fileName: 'course-access.txt', benefits: ['40+ hours of video', '150 solved problems', 'Mock interviews', 'Lifetime access'] },
    { title: 'Resume Review', short: 'A personal review of your tech resume within 48h.', price: 29, thumb: 'https://images.unsplash.com/photo-1524758870432-af57e54afa26?w=600&q=80', file: resumeFile, fileName: 'resume-guide.txt', benefits: ['Line-by-line feedback', 'ATS optimisation', 'Template included'] },
  ]
  const productDocs = []
  for (const p of products) {
    const id = uuid()
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const doc = { id, creatorId: CREATOR_ID, type: 'DIGITAL_DOWNLOAD', title: p.title, slug, description: `${p.short}\n\nEverything you need to succeed, delivered instantly after purchase.`, shortDescription: p.short, thumbnail: p.thumb, price: p.price, currency: 'usd', status: 'PUBLISHED', fileId: p.file, fileName: p.fileName, fileSize: 1200, fileMime: 'text/plain', benefits: p.benefits, createdAt: daysAgo(30), updatedAt: new Date().toISOString() }
    await supabaseAdmin.from('products').insert(doc)
    productDocs.push(doc)
  }

  // Store (published)
  await supabaseAdmin.from('stores').insert({
    id: uuid(), creatorId: CREATOR_ID, username: 'demo', published: true,
    theme: { primaryColor: '#4D7CFF', background: '#12141c', buttonStyle: 'solid', buttonRadius: 16, cardStyle: 'shadow', font: 'Inter' },
    sections: [
      { id: uuid(), type: 'profile', hidden: false, props: {} },
      { id: uuid(), type: 'social_links', hidden: false, props: {} },
      { id: uuid(), type: 'heading', hidden: false, props: { text: 'Master your coding interview', align: 'center' } },
      { id: uuid(), type: 'product_grid', hidden: false, props: { source: 'all' } },
    ],
    seo: {}, createdAt: daysAgo(30), updatedAt: new Date().toISOString(),
  })

  // Customers, orders, entitlements
  const buyers = [
    { name: 'Aisha Khan', email: 'aisha@example.com', product: productDocs[1], day: 2 },
    { name: 'Liam Chen', email: 'liam@example.com', product: productDocs[2], day: 5 },
    { name: 'Sara Gomez', email: 'sara@example.com', product: productDocs[1], day: 9 },
    { name: 'Tom Baker', email: 'tom@example.com', product: productDocs[2], day: 14 },
  ]
  for (const b of buyers) {
    const custId = uuid()
    await supabaseAdmin.from('customers').insert({ id: custId, creatorId: CREATOR_ID, email: b.email, name: b.name, status: 'CUSTOMER', createdAt: daysAgo(b.day), updatedAt: new Date().toISOString() })
    const orderId = uuid()
    await supabaseAdmin.from('orders').insert({ id: orderId, creatorId: CREATOR_ID, productId: b.product.id, customerId: custId, amount: b.product.price, currency: 'usd', status: 'PAID', customerEmail: b.email, stripeCheckoutSessionId: 'seed_' + orderId, stripePaymentIntentId: 'pi_seed_' + orderId, createdAt: daysAgo(b.day), paidAt: daysAgo(b.day), updatedAt: new Date().toISOString() })
    await supabaseAdmin.from('entitlements').insert({ id: uuid(), customerId: custId, creatorId: CREATOR_ID, productId: b.product.id, orderId, source: 'PURCHASE', status: 'ACTIVE', startsAt: daysAgo(b.day), expiresAt: null, createdAt: daysAgo(b.day) })
    await supabaseAdmin.from('analytics_events').insert({ id: uuid(), creatorId: CREATOR_ID, productId: b.product.id, type: 'purchase', metadata: { amount: b.product.price, currency: 'usd' }, createdAt: daysAgo(b.day) })
  }

  // Views
  const events = []
  for (let i = 0; i < 120; i++) events.push({ id: uuid(), creatorId: CREATOR_ID, productId: null, type: 'store_view', createdAt: daysAgo(Math.floor(Math.random() * 20)) })
  for (let i = 0; i < 55; i++) events.push({ id: uuid(), creatorId: CREATOR_ID, productId: productDocs[Math.floor(Math.random() * 3)].id, type: 'product_view', createdAt: daysAgo(Math.floor(Math.random() * 20)) })
  for (let i = 0; i < 9; i++) events.push({ id: uuid(), creatorId: CREATOR_ID, productId: null, type: 'checkout_started', createdAt: daysAgo(Math.floor(Math.random() * 20)) })
  await supabaseAdmin.from('analytics_events').insert(events)

  console.log('Seed complete. Demo store: /demo  |  login: demo@creatorzero.com / demo1234')
}
main().catch((e) => { console.error(e); process.exit(1) })
