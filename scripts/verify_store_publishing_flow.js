import { prisma } from '../lib/prisma.js';
import { authService, storeService, publicService } from '../lib/services.js';
import { storesRepo } from '../lib/repos.js';

async function main() {
  console.log('====================================================');
  console.log(' STORE NAME -> PROFILE -> PUBLISHING FLOW TEST ');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const creatorEmail1 = `ruhan_${timestamp}@example.com`;
  const creatorPassword1 = `RuhanPass123!_${timestamp}`;
  const creatorName1 = 'Ruhan';
  const initialStoreName1 = "Ruhan's Studio";

  // STEP 1: Signup with Store Name
  console.log('1. Signing up creator with Store Name: "Ruhan\'s Studio"...');
  const signup1 = await authService.signup({
    email: creatorEmail1,
    password: creatorPassword1,
    name: creatorName1,
    storeName: initialStoreName1,
    role: 'CREATOR',
  });

  const creatorId1 = signup1.user?.id || signup1.id;
  console.log(`   ✅ Creator 1 created. User ID: ${creatorId1}`);

  // STEP 2: Database Persistence Verification via Prisma
  console.log('\n2. Verifying Store record in Supabase PostgreSQL via Prisma...');
  const dbStore1 = await prisma.store.findUnique({
    where: { creatorId: creatorId1 },
  });

  if (!dbStore1) throw new Error('Store record missing in PostgreSQL database!');
  console.log('   ✅ PostgreSQL Store Record Verified:');
  console.log(`      - Store ID: ${dbStore1.id}`);
  console.log(`      - Creator ID: ${dbStore1.creatorId}`);
  console.log(`      - Store Name: "${dbStore1.storeName}"`);
  console.log(`      - Slug: "${dbStore1.slug}"`);
  console.log(`      - Username: "${dbStore1.username}"`);
  console.log(`      - Published: ${dbStore1.published}`);

  if (dbStore1.storeName !== "Ruhan's Studio") throw new Error(`Expected Store Name "Ruhan's Studio", got "${dbStore1.storeName}"`);
  if (dbStore1.slug !== 'ruhans-studio') throw new Error(`Expected Slug "ruhans-studio", got "${dbStore1.slug}"`);
  if (dbStore1.published !== false) throw new Error('Store should initially be unpublished (draft)');

  const canonicalStoreId1 = dbStore1.id;

  // STEP 3: Profile & Settings Load & Edit
  console.log('\n3. Fetching Store Settings (Profile page load)...');
  const settingsRes = await storeService.getSettings(creatorId1);
  console.log(`   ✅ Settings Loaded: Store Name = "${settingsRes.settings.storeName}", URL = "${settingsRes.settings.publicUrl}"`);

  console.log('   Updating Store Name to "Ruhan\'s Digital Studio"...');
  await storeService.update(creatorId1, { storeName: "Ruhan's Digital Studio" });

  const updatedDbStore1 = await prisma.store.findUnique({ where: { creatorId: creatorId1 } });
  console.log(`   ✅ Updated Store Name in DB: "${updatedDbStore1.storeName}", Slug: "${updatedDbStore1.slug}"`);
  if (updatedDbStore1.storeName !== "Ruhan's Digital Studio") throw new Error('Store Name update failed');

  // STEP 4: Slug Collision Handling (Creator 2 enters same Store Name)
  console.log('\n4. Testing Slug Collision (Creator 2 signs up with "Ruhan\'s Studio")...');
  const creatorEmail2 = `ruhan2_${timestamp}@example.com`;
  const signup2 = await authService.signup({
    email: creatorEmail2,
    password: creatorPassword1,
    name: 'Ruhan Duplicate',
    storeName: "Ruhan's Studio",
    role: 'CREATOR',
  });

  const creatorId2 = signup2.user?.id || signup2.id;
  const dbStore2 = await prisma.store.findUnique({ where: { creatorId: creatorId2 } });
  console.log(`   ✅ Creator 2 Store Created: Slug = "${dbStore2.slug}" (Collision avoided!)`);
  if (!dbStore2.slug.includes('ruhans-studio')) throw new Error('Collision slug should contain base slug');
  if (dbStore2.slug === updatedDbStore1.slug) throw new Error('Collision error: duplicate slug was assigned!');

  // STEP 5: Store Publishing (Single Canonical Store Verification)
  console.log('\n5. Publishing Creator 1 Store ("Publish Store" action)...');
  const publishRes = await storeService.publish(creatorId1);
  console.log(`   ✅ Store Published! Status: ${publishRes.store.published}, Public URL: ${publishRes.publicUrl}`);

  const postPublishStore = await prisma.store.findUnique({ where: { creatorId: creatorId1 } });
  if (postPublishStore.id !== canonicalStoreId1) {
    throw new Error(`CRITICAL FAIL: Store ID changed after publishing! Initial: ${canonicalStoreId1}, Post-publish: ${postPublishStore.id}`);
  }
  console.log(`   ✅ Verified CANONICAL STORE preserved (Store ID stayed ${canonicalStoreId1}).`);

  // STEP 6: Public Storefront Lookup
  console.log('\n6. Testing Public Storefront route query (publicService.getStore)...');
  const publicStoreData = await publicService.getStore(postPublishStore.slug);
  if (!publicStoreData) throw new Error(`Published store not found via slug "${postPublishStore.slug}"`);
  console.log(`   ✅ Public Store Retrieved! Name: "${publicStoreData.storeName}", Slug: "${publicStoreData.slug}"`);

  // STEP 7: Unpublished Store Protection
  console.log('\n7. Testing Unpublished Store Privacy (Unpublishing & querying)...');
  await storeService.unpublish(creatorId1);
  const unpubData = await publicService.getStore(postPublishStore.slug);
  if (unpubData !== null) throw new Error('Unpublished store was incorrectly returned to public visitor!');
  console.log('   ✅ Unpublished store correctly returned 404 (null) to public visitors.');

  // STEP 8: Cleanup
  console.log('\n8. Cleaning up test accounts...');
  const { supabaseAdmin } = await import('../lib/supabase.js');
  await supabaseAdmin.auth.admin.deleteUser(creatorId1);
  await supabaseAdmin.auth.admin.deleteUser(creatorId2);
  await prisma.user.deleteMany({ where: { id: { in: [creatorId1, creatorId2] } } });
  console.log('   ✅ Test accounts cleaned up successfully.');

  console.log('\n====================================================');
  console.log(' ALL STORE NAME & PUBLISHING TESTS PASSED! ');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('\n❌ STORE FLOW TEST FAILED:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
