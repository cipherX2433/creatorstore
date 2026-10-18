import { storeService } from '../lib/services.js'
import { storesRepo, storeSectionsRepo, productsRepo } from '../lib/repos.js'

async function test() {
  const creatorId = '7c82e806-f336-4ee4-8121-6418967e1285'
  const store = await storeService.getOrCreate(creatorId)
  console.log('BEFORE UPDATE, sections in store:', JSON.stringify(store.sections, null, 2))

  // Find the collection section
  const collectionSec = store.sections.find(s => s.type === 'collection')
  console.log('Collection section before:', collectionSec)

  // Products
  const prods = await productsRepo.listByCreator(creatorId)
  console.log('Products:', prods.map(p => ({ id: p.id, title: p.title })))

  // Let's add the 2 products to collection
  const updatedSections = store.sections.map(s => {
    if (s.id === collectionSec.id) {
      return {
        ...s,
        props: {
          ...s.props,
          title: 'abc',
          layout: 'grid',
          displayMode: 'grid',
          items: [
            { id: 'item-1', type: 'product', productId: prods[0].id },
            { id: 'item-2', type: 'product', productId: prods[1].id }
          ]
        }
      }
    }
    return s
  })

  console.log('Sending patch to storeService.update...')
  const result = await storeService.update(creatorId, {
    sections: updatedSections
  })
  console.log('Result from storeService.update:', JSON.stringify(result.sections, null, 2))

  // Now let's fetch again from storeService.getOrCreate (like a page refresh)
  const reloaded = await storeService.getOrCreate(creatorId)
  console.log('Reloaded sections after refresh:', JSON.stringify(reloaded.sections, null, 2))

  process.exit(0)
}

test().catch(e => {
  console.error(e)
  process.exit(1)
})
