const http = require('http')
const fs = require('fs')
const path = require('path')

async function runEndToEndTest() {
  console.log('========================================')
  console.log('END-TO-END DIGITAL DOWNLOAD AUDIT TEST')
  console.log('========================================')

  const { entitlementsRepo, ordersRepo, productsRepo, customersRepo } = require('../lib/repos')
  const { downloadService, webhookService } = require('../lib/services')
  const { prisma } = await import('../lib/prisma.js')
  const { supabaseAdmin, ensureBucket } = await import('../lib/supabase.js')

  // 1. Ensure private product-files bucket exists
  await ensureBucket('product-files', false)
  console.log('[1/7] Verified Supabase Storage private bucket product-files exists: PASS')

  // 2. Create or find test product
  const creator = await prisma.user.findFirst({ where: { role: 'CREATOR' } })
  if (!creator) throw new Error('No creator found')

  const productTitle = `Test Ebook Guide ${Date.now()}`
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF', 'utf-8')
  
  const testFileName = `digital-guide-${Date.now()}.pdf`
  const fileId = `prod_test_${Date.now()}_${testFileName}`

  // Upload test PDF to product-files bucket in Supabase Storage
  const { data: upData, error: upErr } = await supabaseAdmin.storage
    .from('product-files')
    .upload(fileId, pdfContent, { contentType: 'application/pdf', upsert: true })

  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
  console.log('[2/7] Uploaded PDF resource to Supabase Storage:', fileId)

  // Save product in PostgreSQL
  const product = await productsRepo.create({
    creatorId: creator.id,
    title: productTitle,
    type: 'DIGITAL_DOWNLOAD',
    price: 499,
    currency: 'INR',
    status: 'PUBLISHED',
    fileId,
    fileName: testFileName,
    fileSize: pdfContent.length,
    fileMime: 'application/pdf',
    storePublished: true,
    marketplacePublished: true
  })
  console.log('[3/7] Saved & published Digital Product in PostgreSQL:', product.id)

  // 3. Perform test purchase flow (Create Order -> Razorpay finalize -> Create Entitlement)
  const customerEmail = `tester-${Date.now()}@creatorzero.com`
  const customer = await customersRepo.upsert(creator.id, { name: 'Test Customer', email: customerEmail })
  const orderId = crypto.randomUUID()
  const order = await ordersRepo.create({
    id: orderId,
    creatorId: creator.id,
    customerId: customer.id,
    productId: product.id,
    customerName: customer.name,
    customerEmail: customer.email,
    amount: 499,
    currency: 'INR',
    status: 'PAID',
    paymentMode: 'TEST',
    razorpayOrderId: `rzp_order_${Date.now()}`,
    razorpayPaymentId: `pay_test_${Date.now()}`,
  })

  await entitlementsRepo.createForOrder({
    orderId: order.id,
    customerId: customer.id,
    productId: product.id,
    customerEmail: customer.email,
    status: 'ACTIVE'
  })
  console.log('[4/7] Completed test purchase order and active entitlement:', order.id)

  // 4. Test download token generation & resolution
  const downloadUrl = downloadService.buildUrl(order)
  const token = new URL(downloadUrl).searchParams.get('token')
  const resolved = await downloadService.resolve(token)
  console.log('[5/7] Resolved download token successfully:', resolved.product.fileName)

  // 5. Test HTTP GET /api/download?token=...
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/download?token=${encodeURIComponent(token)}`,
    method: 'GET'
  }

  const resPromise = new Promise((resolve, reject) => {
    http.get(options, (res) => {
      resolve(res)
    }).on('error', reject)
  })

  const httpRes = await resPromise
  console.log('[6/7] HTTP GET /api/download response status:', httpRes.statusCode)

  if (httpRes.statusCode === 302) {
    const redirectUrl = httpRes.headers.location
    console.log('  302 Redirect to signed URL:', redirectUrl ? 'YES' : 'NO')
    // Fetch redirect URL
    const fetchRes = await fetch(redirectUrl)
    const fileBytes = Buffer.from(await fetchRes.arrayBuffer())
    console.log('  Downloaded file size:', fileBytes.length, 'bytes (Expected:', pdfContent.length, ')')
    if (fileBytes.toString().includes('%PDF-1.4')) {
      console.log('  Downloaded file is VALID PDF: PASS')
    } else {
      throw new Error(`File content mismatch! First 100 bytes: ${fileBytes.toString().slice(0, 100)}`)
    }
  } else if (httpRes.statusCode === 200) {
    const chunks = []
    for await (const chunk of httpRes) {
      chunks.push(chunk)
    }
    const fileBytes = Buffer.concat(chunks)
    console.log('  Direct stream headers:', httpRes.headers['content-type'], httpRes.headers['content-disposition'])
    console.log('  Downloaded file size:', fileBytes.length, 'bytes')
    if (fileBytes.toString().includes('%PDF-1.4')) {
      console.log('  Downloaded file is VALID PDF: PASS')
    } else {
      throw new Error(`File content mismatch!`)
    }
  } else {
    throw new Error(`Unexpected status code: ${httpRes.statusCode}`)
  }

  // 6. Test JSON request GET /api/download?token=...&json=true
  const jsonFetch = await fetch(`http://localhost:3000/api/download?token=${encodeURIComponent(token)}&json=true`)
  const jsonData = await jsonFetch.json()
  console.log('[7/7] JSON API endpoint response:', jsonData)
  if (!jsonData.success || !jsonData.downloadUrl) {
    throw new Error('JSON endpoint did not return valid downloadUrl!')
  }
  console.log('========================================')
  console.log('ALL 7 DIGITAL DOWNLOAD AUDIT CHECKS PASSED!')
  console.log('========================================')
  process.exit(0)
}

runEndToEndTest().catch(err => {
  console.error('Audit Test Error:', err)
  process.exit(1)
})
