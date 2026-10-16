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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cqympezjstcsaofrzkqa.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase Auth Connection...')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key Present:', Boolean(supabaseAnonKey))
console.log('Service Key Present:', Boolean(supabaseServiceKey))

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  try {
    const testEmail = `authtest_${Date.now()}@creatorzero.com`
    const testPassword = 'TestPassword123!'

    console.log(`\n1. Creating user in Supabase Auth (${testEmail})...`)
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'Auth Test User' },
    })

    if (createErr) {
      console.error('❌ Supabase Auth createUser error:', createErr)
      return
    }

    const authUser = createData.user
    console.log('✅ Supabase Auth User Created! ID:', authUser.id, 'Email:', authUser.email)

    console.log('\n2. Testing signInWithPassword...')
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (signInErr) {
      console.error('❌ Supabase Auth signIn error:', signInErr)
    } else {
      console.log('✅ Supabase Auth Login Succeeded! User ID:', signInData.user.id)
    }

    console.log('\n3. Cleaning up test user in Supabase Auth...')
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    if (deleteErr) {
      console.error('❌ Delete error:', deleteErr)
    } else {
      console.log('✅ Supabase Auth Test User Deleted successfully!')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

run()
