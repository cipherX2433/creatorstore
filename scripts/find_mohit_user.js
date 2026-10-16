import { prisma } from '../lib/prisma.js'

async function findMohit() {
  const allUsers = await prisma.user.findMany({
    include: {
      creatorProfile: true,
      store: true,
    }
  })

  console.log(`Total users: ${allUsers.length}`)
  for (const u of allUsers) {
    if (u.email.includes('mohit') || u.store?.username?.includes('mohit') || u.creatorProfile?.name?.includes('mohit')) {
      console.log('FOUND USER:')
      console.log('User:', u)
      const sections = await prisma.storeSection.findMany({ where: { creatorId: u.id } })
      console.log('Sections:', sections)
    }
  }
}

findMohit().catch(console.error).finally(() => prisma.$disconnect())
