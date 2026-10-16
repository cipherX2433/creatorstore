import { prisma } from '../lib/prisma.js';
import { authService } from '../lib/services.js';

async function main() {
  console.log('====================================================');
  console.log(' FULL AUTHENTICATION FLOW & DB INTEGRATION TEST');
  console.log('====================================================\n');

  const timestamp = Date.now();

  // ----------------------------------------------------
  // TEST 1: CREATOR SIGNUP & LOGIN
  // ----------------------------------------------------
  const creatorEmail = `creator_test_${timestamp}@example.com`;
  const creatorPassword = `CreatorPass123!_${timestamp}`;
  const creatorName = `Test Creator ${timestamp}`;

  console.log('--- TEST 1: CREATOR SIGNUP & LOGIN ---');
  console.log(`1. Inserting Creator into Supabase Auth & PostgreSQL...`);
  const creatorSignup = await authService.signup({
    email: creatorEmail,
    password: creatorPassword,
    name: creatorName,
    role: 'CREATOR',
    storeName: `Store ${timestamp}`,
    slug: `store-${timestamp}`,
  });

  const creatorId = creatorSignup.user?.id || creatorSignup.id;
  console.log(`   ✅ Signup successful! User ID: ${creatorId}`);

  console.log('2. Querying PostgreSQL via Prisma for Creator record...');
  const dbCreator = await prisma.user.findUnique({
    where: { id: creatorId },
    include: { creatorProfile: true, store: true }
  });

  if (!dbCreator) throw new Error('Creator user missing in PostgreSQL DB');
  if (!dbCreator.passwordHash || !dbCreator.passwordHash.startsWith('$2')) throw new Error('Password hash is not valid bcrypt');
  if (!dbCreator.creatorProfile) throw new Error('Creator profile missing in PostgreSQL DB');
  console.log(`   ✅ PostgreSQL user verified (Role: ${dbCreator.role}, Profile: YES, Store: ${dbCreator.store?.username})`);

  console.log('3. Logging in as Creator...');
  const creatorLogin = await authService.login({
    email: creatorEmail,
    password: creatorPassword,
  });
  if (creatorLogin.user.id !== creatorId) throw new Error('Login returned wrong user ID');
  console.log(`   ✅ Login successful! Logged in as: ${creatorLogin.user.email}`);

  // ----------------------------------------------------
  // TEST 2: CUSTOMER SIGNUP & LOGIN
  // ----------------------------------------------------
  const customerEmail = `customer_test_${timestamp}@example.com`;
  const customerPassword = `CustomerPass123!_${timestamp}`;
  const customerName = `Test Customer ${timestamp}`;

  console.log('\n--- TEST 2: CUSTOMER SIGNUP & LOGIN ---');
  console.log(`1. Inserting Customer into Supabase Auth & PostgreSQL...`);
  const customerSignup = await authService.signup({
    email: customerEmail,
    password: customerPassword,
    name: customerName,
    role: 'CUSTOMER',
    creatorId: creatorId,
  });

  const customerId = customerSignup.user?.id || customerSignup.id;
  console.log(`   ✅ Signup successful! Customer User ID: ${customerId}`);

  console.log('2. Querying PostgreSQL via Prisma for Customer record...');
  const dbCustomer = await prisma.user.findUnique({
    where: { id: customerId },
    include: { customers: true }
  });

  if (!dbCustomer) throw new Error('Customer user missing in PostgreSQL DB');
  console.log(`   ✅ PostgreSQL customer verified (Role: ${dbCustomer.role}, Linked Customer Records: ${dbCustomer.customers.length})`);

  console.log('3. Logging in as Customer...');
  const customerLogin = await authService.login({
    email: customerEmail,
    password: customerPassword,
  });
  if (customerLogin.user.id !== customerId) throw new Error('Login returned wrong user ID');
  console.log(`   ✅ Login successful! Logged in as: ${customerLogin.user.email}`);

  // ----------------------------------------------------
  // TEST 3: INVALID CREDENTIALS REJECTION
  // ----------------------------------------------------
  console.log('\n--- TEST 3: SECURITY CHECK (INVALID PASSWORD) ---');
  try {
    await authService.login({
      email: creatorEmail,
      password: 'WrongPassword123!',
    });
    throw new Error('Invalid password was NOT rejected!');
  } catch (err) {
    if (err.message.includes('NOT rejected')) throw err;
    console.log(`   ✅ Security check passed: ${err.message}`);
  }

  // ----------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------
  await prisma.store.deleteMany({ where: { creatorId: { in: [creatorId, customerId] } } });
  await prisma.creatorProfile.deleteMany({ where: { creatorId: { in: [creatorId, customerId] } } });
  await prisma.creatorSubscription.deleteMany({ where: { creatorId: { in: [creatorId, customerId] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [creatorId, customerId] } }
  });
  console.log('   ✅ Test users cleaned up successfully.');

  console.log('\n====================================================');
  console.log(' ALL CREATORZERO AUTHENTICATION FLOW TESTS PASSED! ');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('\n❌ TEST FAILED:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
