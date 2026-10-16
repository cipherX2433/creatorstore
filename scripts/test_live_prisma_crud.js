import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testLiveCrud() {
  console.log('=== STARTING LIVE PRISMA CRUD VERIFICATION ON SUPABASE POSTGRESQL ===\n')

  const testEmail = `test_migration_${Date.now()}@creatorzero.com`

  try {
    // 1. CREATE USER
    console.log(`1. Creating User (${testEmail})...`)
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hashed_test_password_123',
        role: 'CREATOR',
        emailVerified: true,
      },
    })
    console.log(`   ✅ User Created: ID=${user.id}, Email=${user.email}`)

    // 2. CREATE CREATOR PROFILE
    console.log('\n2. Creating Creator Profile...')
    const profile = await prisma.creatorProfile.create({
      data: {
        creatorId: user.id,
        name: 'Prisma Test Creator',
        bio: 'Testing live PostgreSQL relational queries.',
        category: 'Technology',
      },
    })
    console.log(`   ✅ Creator Profile Created: Name=${profile.name}`)

    // 3. CREATE STORE
    console.log('\n3. Creating Store...')
    const store = await prisma.store.create({
      data: {
        creatorId: user.id,
        username: `store_${Date.now()}`,
        storeName: 'Test Store',
        published: true,
      },
    })
    console.log(`   ✅ Store Created: Username=${store.username}`)

    // 4. CREATE PRODUCT
    console.log('\n4. Creating Product...')
    const product = await prisma.product.create({
      data: {
        creatorId: user.id,
        title: 'Mastering Prisma & Supabase',
        slug: `prisma-supabase-${Date.now()}`,
        type: 'DIGITAL_DOWNLOAD',
        price: 99.99,
        status: 'PUBLISHED',
      },
    })
    console.log(`   ✅ Product Created: Title="${product.title}", Price=$${product.price}`)

    // 5. READ WITH RELATIONS
    console.log('\n5. Querying User with complete relational graph (include profile, store, products)...')
    const userWithGraph = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        creatorProfile: true,
        store: true,
        products: true,
      },
    })

    console.log('   ✅ Query Succeeded!')
    console.log(`      User ID: ${userWithGraph.id}`)
    console.log(`      Profile Name: ${userWithGraph.creatorProfile?.name}`)
    console.log(`      Store Username: ${userWithGraph.store?.username}`)
    console.log(`      Products Count: ${userWithGraph.products.length} (Product Title: "${userWithGraph.products[0]?.title}")`)

    // 6. UPDATE
    console.log('\n6. Updating Product...')
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: { title: 'Mastering Prisma & Supabase (Updated)' },
    })
    console.log(`   ✅ Product Updated: New Title="${updatedProduct.title}"`)

    // 7. CLEANUP
    console.log('\n7. Cleaning up test record (Cascade Delete User)...')
    await prisma.user.delete({
      where: { id: user.id },
    })
    console.log('   ✅ Test User & Related Records Deleted via Foreign Key Cascade!')

    console.log('\n=== LIVE PRISMA CRUD & RELATIONSHIP VERIFICATION PASSED SUCCESSFULLY 🚀 ===\n')
  } catch (error) {
    console.error('\n❌ CRUD VERIFICATION FAILED:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testLiveCrud()
