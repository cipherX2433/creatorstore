async function inspectDsaCreator() {
  const { prisma } = await import('../lib/prisma.js')
  const prod = await prisma.product.findUnique({ where: { id: '3f12414f-c8a6-40e5-b375-325c457db7f2' } })
  console.log('DSA Product Record:', prod)
}

inspectDsaCreator().catch(console.error)
