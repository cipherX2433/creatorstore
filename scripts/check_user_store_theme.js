import { prisma } from '../lib/prisma.js'

async function checkTheme() {
  const store = await prisma.store.findFirst({
    where: { OR: [{ username: 'ruhan' }, { slug: 'ruhan' }] }
  })
  console.log('Store found for ruhan:')
  console.log('Store ID:', store?.id)
  console.log('Store Username:', store?.username)
  console.log('Store Published:', store?.published)
  console.log('Store Theme in DB:', JSON.stringify(store?.theme, null, 2))
}

checkTheme().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
