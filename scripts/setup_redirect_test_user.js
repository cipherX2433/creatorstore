import { prisma } from '../lib/prisma.js'
import { hashPassword } from '../lib/auth.js'

async function setup() {
  const email = 'redirect_test_user@creatorzero.com'
  const password = 'Password123!'
  const passwordHash = hashPassword(password)
  const username = 'redirecttest'

  // Delete existing if any
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.storeSection.deleteMany({ where: { creatorId: existing.id } })
    await prisma.store.deleteMany({ where: { creatorId: existing.id } })
    await prisma.creatorProfile.deleteMany({ where: { creatorId: existing.id } })
    await prisma.user.delete({ where: { id: existing.id } })
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'CREATOR',
      emailVerified: true,
      country: 'US',
      creatorProfile: {
        create: {
          name: 'Redirect Test',
          category: 'Digital Products',
          onboardingStatus: 'COMPLETED',
          onboardingComplete: true,
        },
      },
      store: {
        create: {
          username,
          slug: username,
          storeName: 'Redirect Test Store',
          published: true,
        },
      },
    },
    include: {
      creatorProfile: true,
      store: true,
    },
  })

  console.log('✅ Created test user:', user.email, 'password:', password, 'username:', username)
}

setup().catch(console.error).finally(() => prisma.$disconnect())
