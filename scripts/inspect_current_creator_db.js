import { prisma } from '../lib/prisma.js'

async function inspect() {
  console.log('--- ALL USERS, PROFILES & STORES IN DATABASE ---')
  const users = await prisma.user.findMany({
    include: {
      creatorProfile: true,
      store: true,
      creatorSubscription: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  for (const u of users) {
    console.log(`\nUser ID: ${u.id}`)
    console.log(`  Email: ${u.email}`)
    console.log(`  Role: ${u.role}`)
    console.log(`  Profile Name (creator_profiles.name): ${u.creatorProfile?.name}`)
    console.log(`  Profile Bio: ${u.creatorProfile?.bio}`)
    console.log(`  Store username (stores.username): ${u.store?.username}`)
    console.log(`  Store slug (stores.slug): ${u.store?.slug}`)
    console.log(`  Store Name (stores.store_name): ${u.store?.storeName}`)
    console.log(`  Store Theme:`, JSON.stringify(u.store?.theme))
    
    const sections = await prisma.storeSection.findMany({
      where: { creatorId: u.id },
      orderBy: { position: 'asc' }
    })
    console.log(`  Sections count: ${sections.length}`)
    for (const s of sections) {
      console.log(`    Section [${s.type}]:`, JSON.stringify(s.props))
    }
  }
}

inspect().catch(console.error).finally(() => prisma.$disconnect())
