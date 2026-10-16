async function runAudit() {
  console.log('--- DIGITAL PRODUCT DOWNLOAD DIAGNOSTIC ---')
  const { entitlementsRepo, ordersRepo, productsRepo } = require('../lib/repos')
  const { downloadService } = require('../lib/services')
  const { prisma } = await import('../lib/prisma.js')
  const { supabaseAdmin } = await import('../lib/supabase.js')

  // 1. Check products with files
  const productsWithFiles = await prisma.product.findMany({
    where: { fileId: { not: null } },
    select: { id: true, title: true, fileId: true, fileName: true, fileSize: true, fileMime: true }
  })
  console.log('Products with files in DB:', productsWithFiles)

  // 2. Test Supabase storage download vs signedUrl for each product fileId
  for (const prod of productsWithFiles) {
    console.log(`Checking product ${prod.id} (${prod.title}), fileId: ${prod.fileId}`)
    
    // A. Check signed URL
    const { data: signedData, error: signedErr } = await supabaseAdmin.storage.from('product-files').createSignedUrl(prod.fileId, 3600)
    console.log('  createSignedUrl:', signedData ? signedData.signedUrl : 'ERROR', signedErr)

    // B. Check direct download
    const { data: fileBuf, error: dlErr } = await supabaseAdmin.storage.from('product-files').download(prod.fileId)
    console.log('  download:', fileBuf ? `Buffer size: ${fileBuf.length || fileBuf.byteLength}` : 'ERROR', dlErr)
  }

  // 3. Check paid orders and download tokens
  const paidOrders = await prisma.order.findMany({
    where: { status: 'PAID' },
    take: 5
  })
  console.log('Paid orders count:', paidOrders.length)
  for (const order of paidOrders) {
    console.log(`Order ${order.id}: productId=${order.productId}, customerId=${order.customerId}, customerEmail=${order.customerEmail}`)
    
    // Check entitlement methods
    const entByOrder = await entitlementsRepo.getByOrder(order.id)
    console.log('  entitlementsRepo.getByOrder(order.id):', entByOrder ? entByOrder.id : 'NONE')
    
    const entHasCustomer = order.customerId ? await entitlementsRepo.has(order.customerId, order.productId) : false
    console.log('  entitlementsRepo.has(order.customerId, order.productId):', entHasCustomer)

    // Test downloadService.buildUrl & resolve
    try {
      const url = downloadService.buildUrl(order)
      const token = new URL(url).searchParams.get('token')
      console.log('  Generated download token:', token ? 'YES' : 'NO')
      const resolved = await downloadService.resolve(token)
      console.log('  downloadService.resolve SUCCESS:', resolved.product.id, resolved.product.fileName)
    } catch (err) {
      console.error('  downloadService.resolve FAILED:', err.message || err, err.status)
    }
  }

  process.exit(0)
}

runAudit().catch(err => {
  console.error('Diagnostic error:', err)
  process.exit(1)
})
