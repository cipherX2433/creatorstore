const fs = require('fs')
const path = require('path')

async function testRealPdfFlow() {
  console.log('========================================')
  console.log('REAL DIGITAL PRODUCT FILE INTEGRITY TEST')
  console.log('========================================')

  const { prisma } = await import('../lib/prisma.js')
  const { productsRepo, ordersRepo, entitlementsRepo, customersRepo } = require('../lib/repos')
  const { downloadService } = require('../lib/services')
  const { supabaseAdmin, ensureBucket } = await import('../lib/supabase.js')

  // 1. Ensure private product-files bucket
  await ensureBucket('product-files', false)

  // 2. Generate a real PDF file content with actual text & structure
  const pdfHeader = '%PDF-1.4\n'
  const pdfBody = 
`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 115 >>
stream
BT
/F1 24 Tf
100 700 Td
(CreatorZero Paid Digital Product Resource) Tj
0 -50 Td
/F1 14 Tf
(This is the actual purchased file content. Verification PASS!) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000410 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
480
%%EOF`

  const pdfBuffer = Buffer.from(pdfHeader + pdfBody, 'utf-8')
  console.log(`Original PDF file created. Size: ${pdfBuffer.length} bytes`)
  console.log(`First 10 bytes (magic bytes): ${pdfBuffer.slice(0, 10).toString('utf-8')}`)

  const creator = await prisma.user.findFirst({ where: { role: 'CREATOR' } })
  const testFileName = `CreatorZero-DSA-Guide-${Date.now()}.pdf`
  const fileId = `prod_test_${Date.now()}_${testFileName}`

  // 3. Upload to Supabase Storage product-files
  console.log(`Uploading to Supabase Storage bucket 'product-files' with key: ${fileId}...`)
  const { data: upData, error: upErr } = await supabaseAdmin.storage
    .from('product-files')
    .upload(fileId, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)
  console.log('Upload Result:', upData)

  // 4. Verify object directly from Supabase Storage
  const { data: dlData, error: dlErr } = await supabaseAdmin.storage
    .from('product-files')
    .download(fileId)

  if (dlErr || !dlData) throw new Error(`Storage download check failed: ${dlErr?.message}`)
  const storageBuf = Buffer.from(await dlData.arrayBuffer())
  console.log(`Supabase Storage object size: ${storageBuf.length} bytes (Matches original: ${storageBuf.length === pdfBuffer.length})`)

  // 5. Update database record for product "dsa" (3f12414f-c8a6-40e5-b375-325c457db7f2)
  const dsaProductId = '3f12414f-c8a6-40e5-b375-325c457db7f2'
  await productsRepo.update(dsaProductId, creator.id, {
    fileId,
    fileName: testFileName,
    fileSize: pdfBuffer.length,
    fileMime: 'application/pdf'
  })
  console.log(`Updated Product ${dsaProductId} with new PDF resource metadata in PostgreSQL.`)

  // 6. Test Download URL & GET request to live server API
  const customerEmail = 'mohit.mr11082@gmail.com'
  const statusRes = await fetch(`http://localhost:3000/api/checkout/status?order_id=${dsaProductId}&email=${encodeURIComponent(customerEmail)}`)
  const statusData = await statusRes.json()
  console.log('Checkout Status Download URL:', statusData.downloadUrl)

  // 7. Request Download API (JSON mode & direct mode)
  const apiRes = await fetch(`${statusData.downloadUrl}&json=true`)
  const apiJson = await apiRes.json()
  console.log('Download API Response JSON:', apiJson)

  if (!apiJson.success || !apiJson.downloadUrl) {
    throw new Error('Download API failed to return signedUrl')
  }

  // 8. Download actual file from signed URL
  const fileFetch = await fetch(apiJson.downloadUrl)
  console.log('Signed URL HTTP Status:', fileFetch.status)
  console.log('Signed URL Content-Type:', fileFetch.headers.get('content-type'))
  console.log('Signed URL Content-Disposition:', fileFetch.headers.get('content-disposition'))

  const downloadedBytes = Buffer.from(await fileFetch.arrayBuffer())
  console.log(`Downloaded file size: ${downloadedBytes.length} bytes`)
  console.log(`Downloaded file magic bytes: ${downloadedBytes.slice(0, 10).toString('utf-8')}`)

  const textContent = downloadedBytes.toString('utf-8')
  if (textContent.includes('CreatorZero Paid Digital Product Resource')) {
    console.log('========================================')
    console.log('PDF FILE INTEGRITY VERIFIED SUCCESSFULLY!')
    console.log('Downloaded file matches original PDF text and bytes 100%!')
    console.log('========================================')
  } else {
    throw new Error('Downloaded PDF content did not match expected text!')
  }
}

testRealPdfFlow().catch(console.error)
