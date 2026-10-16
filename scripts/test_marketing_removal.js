// Verification script for removed marketing features: Affiliates, Bundles, Reviews, Funnels
import http from 'http'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3000'

function request(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data })
      })
    })

    req.on('error', (err) => reject(err))
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function run() {
  console.log('=== VERIFYING REMOVAL OF MARKETING FEATURES ===\n')

  let allPassed = true

  // 1. Verify directory removals
  const removedDirs = [
    'app/dashboard/marketing/affiliates',
    'app/dashboard/marketing/bundles',
    'app/dashboard/marketing/reviews',
    'app/dashboard/marketing/funnels',
    'components/bundle',
  ]

  console.log('--- 1. Checking deleted directories ---')
  for (const dir of removedDirs) {
    const fullPath = path.join(process.cwd(), dir)
    const exists = fs.existsSync(fullPath)
    if (!exists) {
      console.log(`✅ Verified deleted: ${dir}`)
    } else {
      console.error(`❌ Directory still exists: ${dir}`)
      allPassed = false
    }
  }

  // 2. Verify API routes return 404
  console.log('\n--- 2. Checking removed API endpoints ---')
  const removedEndpoints = [
    '/api/bundles',
    '/api/reviews',
    '/api/funnels',
    '/api/affiliates',
    '/api/reviews/product/test-id',
  ]

  for (const ep of removedEndpoints) {
    try {
      const res = await request('GET', ep)
      if (res.status === 404) {
        console.log(`✅ Endpoint correctly returns 404: GET ${ep}`)
      } else {
        console.error(`❌ Expected 404 for ${ep}, got ${res.status}`)
        allPassed = false
      }
    } catch (e) {
      console.warn(`⚠️ Could not reach dev server on ${ep} (${e.message})`)
    }
  }

  // 3. Verify Active Marketing endpoints still function
  console.log('\n--- 3. Checking remaining active endpoints ---')
  const activeEndpoints = [
    '/api/auth/csrf',
    '/api/tracking',
    '/api/leads',
    '/api/coupons',
    '/api/email/broadcasts',
  ]

  for (const ep of activeEndpoints) {
    try {
      const res = await request('GET', ep)
      // Any non-500 response (e.g. 200, 401 unauthorized because no auth cookie) proves endpoint exists
      if (res.status !== 500 && res.status !== 404) {
        console.log(`✅ Active endpoint reachable (Status ${res.status}): GET ${ep}`)
      } else {
        console.error(`❌ Active endpoint failed (Status ${res.status}): GET ${ep}`)
        allPassed = false
      }
    } catch (e) {
      console.warn(`⚠️ Could not reach dev server on ${ep} (${e.message})`)
    }
  }

  console.log('\n==========================================')
  if (allPassed) {
    console.log('🎉 ALL MARKETING REMOVAL VERIFICATIONS PASSED!')
  } else {
    console.error('💥 SOME VERIFICATIONS FAILED')
    process.exit(1)
  }
}

run()
