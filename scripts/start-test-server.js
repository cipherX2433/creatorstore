const { spawn } = require('child_process')
const path = require('path')

async function start() {
  console.log('Starting CreatorZero platform server (Supabase PostgreSQL engine)...')

  // Run database seeder
  try {
    console.log('Seeding initial demo data...')
    const seed = require('./seed.js')
  } catch (e) {
    console.error('Seed error:', e)
  }

  // Start Next.js production server
  console.log('Starting Next.js server on port 3000...')
  const app = spawn('npx', ['next', 'start', '-p', '3000'], {
    env: { ...process.env, PORT: '3000', COOKIE_SECURE: 'false' },
    stdio: 'inherit',
  })

  app.on('exit', (code) => {
    console.log(`Next.js server exited with code ${code}`)
  })
}

start().catch(console.error)
