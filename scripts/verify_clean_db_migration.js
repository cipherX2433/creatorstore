import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import assert from 'assert'

const prisma = new PrismaClient()

async function testCleanMigration() {
  console.log('--- STARTING CLEAN TEST DATABASE MIGRATION VERIFICATION ---')
  const testSchema = 'disposable_migration_test_' + Date.now()

  try {
    // 1. Create clean disposable schema
    console.log(`1. Creating clean disposable schema: ${testSchema}`)
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${testSchema}";`)

    function parseSqlStatements(sql) {
      return sql
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--.*$/gm, '')
        .trim()
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'prisma/migrations/20261010151800_add_otp_verifications/migration.sql'),
      'utf8'
    )
    const migrationStatements = parseSqlStatements(migrationSql)

    // 2. Set search path inside a transaction so all statements share the exact same connection
    console.log('2. Applying baseline 0_init and incremental migration in transaction...')
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET search_path TO "${testSchema}", public;`)

      const initSql = fs.readFileSync(path.join(process.cwd(), 'prisma/migrations/0_init/migration.sql'), 'utf8')
      const initStatements = parseSqlStatements(initSql)

      for (const stmt of initStatements) {
        await tx.$executeRawUnsafe(stmt + ';')
      }
      console.log(`   Baseline 0_init applied (${initStatements.length} statements).`)

      for (const stmt of migrationStatements) {
        await tx.$executeRawUnsafe(stmt + ';')
      }
      console.log(`   Incremental migration applied (${migrationStatements.length} statements).`)
    }, { timeout: 30000 })

    // 5. Verify table columns and constraints
    console.log('4. Introspecting generated schema in clean database...')
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = '${testSchema}' AND table_name = 'otp_verifications'
      ORDER BY ordinal_position;
    `)

    assert.ok(columns.length >= 12, 'Must have at least 12 columns')
    const colNames = columns.map((c) => c.column_name)
    console.log('   Columns present:', colNames.join(', '))
    assert.ok(colNames.includes('id'), 'Missing id column')
    assert.ok(colNames.includes('identifier'), 'Missing identifier column')
    assert.ok(colNames.includes('purpose'), 'Missing purpose column')
    assert.ok(colNames.includes('otp_hash'), 'Missing otp_hash column')
    assert.ok(colNames.includes('attempts'), 'Missing attempts column')
    assert.ok(colNames.includes('max_attempts'), 'Missing max_attempts column')
    assert.ok(colNames.includes('expires_at'), 'Missing expires_at column')
    assert.ok(colNames.includes('resend_available_at'), 'Missing resend_available_at column')
    assert.ok(colNames.includes('consumed_at'), 'Missing consumed_at column')

    // 6. Verify indexes
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = '${testSchema}' AND tablename = 'otp_verifications';
    `)
    const indexNames = indexes.map((i) => i.indexname)
    console.log('   Indexes present:', indexNames.join(', '))
    assert.ok(indexNames.includes('otp_verifications_pkey'), 'Missing primary key index')
    assert.ok(indexNames.includes('uq_otp_identifier_purpose'), 'Missing unique composite index')
    assert.ok(indexNames.includes('idx_otp_expires_at'), 'Missing expires_at index')

    // 7. Verify Idempotency: Run migration second time in transaction
    console.log('5. Testing idempotency: Running migration a second time...')
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET search_path TO "${testSchema}", public;`)
      for (const stmt of migrationStatements) {
        await tx.$executeRawUnsafe(stmt + ';')
      }
    }, { timeout: 30000 })
    console.log('   Idempotency confirmed: Second execution succeeded with 0 errors.')

    // 8. Test CRUD operations on clean table
    console.log('6. Testing data operations on clean table...')
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${testSchema}"."otp_verifications" 
        (identifier, purpose, otp_hash, attempts, max_attempts, expires_at, resend_available_at)
      VALUES 
        ('test@example.com', 'EMAIL_VERIFICATION', 'dummy_hash', 0, 5, NOW() + INTERVAL '10 minutes', NOW() + INTERVAL '1 minute');
    `)
    const rows = await prisma.$queryRawUnsafe(`
      SELECT * FROM "${testSchema}"."otp_verifications" WHERE identifier = 'test@example.com';
    `)
    assert.strictEqual(rows.length, 1, 'Row must exist')
    console.log('   Row inserted and queried successfully.')

    console.log('--- ALL CLEAN TEST DATABASE MIGRATION CHECKS PASSED! ---')
  } finally {
    console.log(`7. Cleaning up test schema: ${testSchema}`)
    await prisma.$executeRawUnsafe(`SET search_path TO public;`)
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`)
    await prisma.$disconnect()
  }
}

testCleanMigration().catch((e) => {
  console.error('FAILED MIGRATION VERIFICATION:', e)
  process.exit(1)
})
