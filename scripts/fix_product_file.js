async function fixProductStorageFile() {
  const { prisma, productsRepo } = require('../lib/repos')
  const { supabaseAdmin, ensureBucket } = await import('../lib/supabase.js')

  const prodId = '3f12414f-c8a6-40e5-b375-325c457db7f2'
  const prod = await productsRepo.getById(prodId)
  console.log('Product:', prod.id, prod.title, prod.fileName, prod.fileId)

  // Ensure bucket
  await ensureBucket('product-files', false)

  // Create a real PNG image buffer as test resource
  const sampleImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )

  const fileId = prod.fileId || `prod_${prod.id}_${Date.now()}_resource.png`
  console.log(`Uploading file ${fileId} to product-files bucket...`)

  const { data: upData, error: upErr } = await supabaseAdmin.storage
    .from('product-files')
    .upload(fileId, sampleImageBuffer, { contentType: prod.fileMime || 'image/png', upsert: true })

  if (upErr) {
    console.error('Upload error:', upErr)
  } else {
    console.log('Upload success:', upData)
    await productsRepo.update(prodId, prod.creatorId, {
      fileId,
      fileName: prod.fileName || 'dsa-guide.png',
      fileSize: sampleImageBuffer.length,
      fileMime: prod.fileMime || 'image/png'
    })
    console.log('Updated product fileId in DB successfully!')
  }
}

fixProductStorageFile().catch(console.error)
