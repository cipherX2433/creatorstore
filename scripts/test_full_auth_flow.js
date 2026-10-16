import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const BASE_URL = 'http://localhost:3000/api'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cqympezjstcsaofrzkqa.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testFullAuthFlow() {
  console.log('================================================================================')
  console.log('TESTING FULL AUTHENTICATION FLOW (Supabase Auth + Prisma PostgreSQL)')
  console.log('================================================================================\n')

  const timestamp = Date.now()
  const customerEmail = `customer_auth_${timestamp}@creatorzero.com`
  const creatorEmail = `creator_auth_${timestamp}@creatorzero.com`
  const password = 'SecurePassword123!'
  const username = `creator_${timestamp}`

  let customerId = null
  let creatorId = null

  try {
    // --------------------------------------------------------------------------
    // 1. CUSTOMER SIGNUP
    // --------------------------------------------------------------------------
    console.log(`1. Testing Customer Signup (${customerEmail})...`)
    const res1 = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: password,
        name: 'John Customer',
        phone: '+91 9876543210',
        accountType: 'CUSTOMER',
        role: 'CUSTOMER',
      }),
    })

    const data1 = await res1.json()
    if (res1.status !== 200 || !data1.user?.id) {
      console.error('❌ Customer Signup Failed:', res1.status, data1)
      process.exit(1)
    }
    customerId = data1.user.id
    console.log(`   ✅ Customer Created Successfully! User ID=${customerId}, Role=${data1.user.role}`)

    // --------------------------------------------------------------------------
    // 2. CUSTOMER LOGIN
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Customer Login with Supabase Auth...')
    const res2 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: password,
      }),
    })

    const data2 = await res2.json()
    if (res2.status !== 200 || data2.user?.id !== customerId) {
      console.error('❌ Customer Login Failed:', res2.status, data2)
      process.exit(1)
    }
    console.log(`   ✅ Customer Login Succeeded! User ID=${data2.user.id}`)

    // --------------------------------------------------------------------------
    // 3. CREATOR SIGNUP
    // --------------------------------------------------------------------------
    console.log(`\n3. Testing Creator Signup (${creatorEmail}, @${username})...`)
    const res3 = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creatorEmail,
        password: password,
        name: 'Alice Creator',
        username: username,
        phone: '+91 9999988888',
        accountType: 'CREATOR',
        role: 'CREATOR',
      }),
    })

    const data3 = await res3.json()
    if (res3.status !== 200 || !data3.user?.id) {
      console.error('❌ Creator Signup Failed:', res3.status, data3)
      process.exit(1)
    }
    creatorId = data3.user.id
    console.log(`   ✅ Creator Created Successfully! User ID=${creatorId}, Role=${data3.user.role}`)

    // --------------------------------------------------------------------------
    // 4. CREATOR LOGIN
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Creator Login with Supabase Auth...')
    const res4 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creatorEmail,
        password: password,
      }),
    })

    const data4 = await res4.json()
    if (res4.status !== 200 || data4.user?.id !== creatorId) {
      console.error('❌ Creator Login Failed:', res4.status, data4)
      process.exit(1)
    }
    console.log(`   ✅ Creator Login Succeeded! User ID=${data4.user.id}`)

    // --------------------------------------------------------------------------
    // 5. DUPLICATE EMAIL SIGNUP REJECTION
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Duplicate Email Signup Rejection (409 expected)...')
    const res5 = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creatorEmail,
        password: password,
        name: 'Duplicate Test',
        username: `dup_${timestamp}`,
        phone: '+91 1111111111',
      }),
    })
    if (res5.status === 409) {
      console.log('   ✅ Duplicate Email Rejection Works (409 Conflict returned)!')
    } else {
      console.error('❌ Duplicate Email Test Failed:', res5.status)
      process.exit(1)
    }

    // --------------------------------------------------------------------------
    // 6. INVALID PASSWORD LOGIN REJECTION
    // --------------------------------------------------------------------------
    console.log('\n6. Testing Wrong Password Login Rejection (401 expected)...')
    const res6 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creatorEmail,
        password: 'WrongPassword999!',
      }),
    })
    if (res6.status === 401) {
      console.log('   ✅ Invalid Password Login Rejection Works (401 Unauthorized returned)!')
    } else {
      console.error('❌ Invalid Password Login Test Failed:', res6.status)
      process.exit(1)
    }

    console.log('\n================================================================================')
    console.log('🎉 FULL AUTHENTICATION FLOW VERIFICATION COMPLETED SUCCESSFULLY WITH 100% PASS!')
    console.log('================================================================================\n')
  } catch (err) {
    console.error('❌ AUTH FLOW TEST EXCEPTION:', err)
    process.exit(1)
  } finally {
    // Clean up Supabase Auth test users
    if (customerId) await supabaseAdmin.auth.admin.deleteUser(customerId).catch(() => {})
    if (creatorId) await supabaseAdmin.auth.admin.deleteUser(creatorId).catch(() => {})
  }
}

testFullAuthFlow()
