import { prisma } from '../lib/prisma.js'
import { storeService } from '../lib/services.js'
import { storesRepo, storeSectionsRepo, productsRepo } from '../lib/repos.js'

async function test() {
  console.log('Testing collection persistence...')
  // Find a creator or user
  const user = await prisma.user.findFirst()
  if (!user) {
    console.log('No user found')
    process.exit(1)
  }
  const creatorId = user.id
  console.log('Using creatorId:', creatorId)

  // Get products of creator
  let prods = await productsRepo.listByCreator(creatorId)
  console.log('Found products for creator:', prods.map(p => ({ id: p.id, title: p.title, status: p.status })))

  // Get store
  const store = await storeService.getOrCreate(creatorId)
  console.log('Current sections count:', store.sections?.length)
  console.log('Current sections:', JSON.stringify(store.sections, null, 2))

  process.exit(0)
}

test().catch(e => {
  console.error(e)
  process.exit(1)
})
