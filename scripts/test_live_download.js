async function testFreshProductDownload() {
  const { prisma } = await import('../lib/prisma.js')
  const { ordersRepo, productsRepo, entitlementsRepo, customersRepo } = require('../lib/repos')
  const { downloadService } = require('../lib/services')
  const { supabaseAdmin, ensureBucket } = await import('../lib/supabase.js')

  // 1. Ensure private product-files bucket exists
  await ensureBucket('product-files', false)

  const creator = await prisma.user.findFirst({ where: { role: 'CREATOR' } })
  const fileContent = Buffer.from('REAL DIGITAL EBOOK CONTENT - PDF SAMPLE', 'utf-8')
  const fileName = `sample-guide-${Date.now()}.pdf`
  const fileId = `prod_test_${Date.now()}_${fileName}`

  // 2. Upload file to Supabase Storage product-files
  const { data: upData, error: upErr } = await supabaseAdmin.storage
    .from('product-files')
    .upload(fileId, fileContent, { contentType: 'application/pdf', upsert: true })

  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
  console.log('[1/4] File uploaded to Supabase Storage product-files:', fileId)

  // 3. Create Product in DB
  const product = await productsRepo.create({
    creatorId: creator.id,
    title: `Live Test Product ${Date.now()}`,
    type: 'DIGITAL_DOWNLOAD',
    price: 199,
    currency: 'INR',
    status: 'PUBLISHED',
    fileId,
    fileName,
    fileSize: fileContent.length,
    fileMime: 'application/pdf',
    storePublished: true,
    marketplacePublished: true
  })
  console.log('[2/4] Product created in DB:', product.id)

  // 4. Create Customer, Order, and Entitlement
  const customer = await customersRepo.upsert(creator.id, { name: 'Live Tester', email: `livetest-${Date.now()}@creatorzero.com` })
  const orderId = crypto.randomUUID()
  const order = await ordersRepo.create({
    id: orderId,
    creatorId: creator.id,
    customerId: customer.id,
    productId: product.id,
    customerName: customer.name,
    customerEmail: customer.email,
    amount: 199,
    currency: 'INR',
    status: 'PAID',
    paymentMode: 'TEST',
    razorpayOrderId: `rzp_${Date.now()}`,
    razorpayPaymentId: `pay_${Date.now()}`
  })

  await entitlementsRepo.createForOrder({
    orderId: order.id,
    customerId: customer.id,
    productId: product.id,
    customerEmail: customer.email,
    status: 'ACTIVE'
  })
  console.log('[3/4] Order & Entitlement created:', order.id)

  // 5. Test Live Server Download via HTTP
  const downloadUrl = downloadService.buildUrl(order)
  console.log('Testing download via live server API:', downloadUrl)

  const res = await fetch(downloadUrl, { redirect: 'manual' })
  console.log('Server Status:', res.status)

  if (res.status === 302) {
    const loc = res.headers.get('location')
    console.log('302 Redirected to Supabase signed URL:', loc)
    const fileRes = await fetch(loc)
    const downloadedBuf = Buffer.from(await fileRes.arrayBuffer())
    console.log('[4/4] SUCCESS! Downloaded file bytes:', downloadedBuf.length, 'bytes')
    console.log('File Content Matches Original:', downloadedBuf.toString() === fileContent.toString())
  } else {
    const body = await res.text()
    console.error('FAILED response body:', body)
  }

  // Also test with json=true API
  const jsonRes = await fetch(`${downloadUrl}&json=true`)
  const jsonBody = await jsonRes.json()
  console.log('JSON API Response:', jsonBody)
  
  if (jsonBody.success && jsonBody.downloadUrl) {
    console.log('JSON API SUCCESS! Signed URL:', jsonBody.downloadUrl)
  } else {
    console.error('JSON API FAILED!')
  }
}

testFreshProductDownload().catch(console.error)
