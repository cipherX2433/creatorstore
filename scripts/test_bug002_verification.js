import { profilesRepo, storesRepo, usersRepo } from '../lib/repos.js';
import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

async function testBug002() {
  console.log('====================================================');
  console.log(' BUG-002: PROFILESREPO.UPSERT PAYLOAD SANITIZATION TEST');
  console.log('====================================================\n');

  const testId = uuidv4();
  const testEmail = `bug002_test_${Date.now()}@example.com`;
  const username = `testhandle_${Date.now()}`;

  try {
    // 1. Create base user record
    await prisma.user.create({
      data: {
        id: testId,
        email: testEmail,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'CREATOR',
      }
    });

    // 2. Call profilesRepo.upsert with store-level 'username' included
    console.log('1. Calling profilesRepo.upsert() with { name, bio, category, socialLinks, username }...');
    const result = await profilesRepo.upsert(testId, {
      name: 'Sanitized Creator',
      bio: 'Verified bio without Prisma model errors',
      category: 'Software Development',
      socialLinks: { twitter: 'sanitized_creator', github: 'sanitized_creator' },
      username: username, // Should be sanitized out of CreatorProfile payload
      onboardingComplete: true,
    });

    console.log('   ✅ profilesRepo.upsert returned without throwing any Prisma schema errors!');
    if (!result || result.name !== 'Sanitized Creator') {
      throw new Error(`Profile upsert returned unexpected result: ${JSON.stringify(result)}`);
    }

    // 3. Verify in PostgreSQL directly via Prisma
    console.log('2. Verifying CreatorProfile record in PostgreSQL database via Prisma...');
    const dbProfile = await prisma.creatorProfile.findUnique({
      where: { creatorId: testId }
    });

    if (!dbProfile) throw new Error('CreatorProfile missing in DB');
    if (dbProfile.name !== 'Sanitized Creator' || dbProfile.bio !== 'Verified bio without Prisma model errors') {
      throw new Error(`DB profile content mismatch: ${JSON.stringify(dbProfile)}`);
    }
    console.log('   ✅ CreatorProfile correctly persisted in DB with sanitized schema attributes.');

    // 4. Update store handle through Store flow
    console.log('3. Updating Store handle through Store repository...');
    await storesRepo.upsertStore(testId, {
      username: username,
      storeName: 'Sanitized Store',
    });
    const dbStore = await storesRepo.getByCreator(testId);
    if (!dbStore || dbStore.username !== username) {
      throw new Error(`Store handle mismatch: ${JSON.stringify(dbStore)}`);
    }
    console.log(`   ✅ Store handle verified on Store model: ${dbStore.username}`);

    console.log('\n====================================================');
    console.log(' BUG-002 VERIFICATION PASSED (0 PRISMA SCHEMA ERRORS)');
    console.log('====================================================\n');
  } finally {
    // Cleanup
    await prisma.store.deleteMany({ where: { creatorId: testId } });
    await prisma.creatorProfile.deleteMany({ where: { creatorId: testId } });
    await prisma.user.deleteMany({ where: { id: testId } });
    await prisma.$disconnect();
  }
}

testBug002().catch((e) => {
  console.error('\n❌ BUG-002 TEST FAILED:', e);
  process.exit(1);
});
