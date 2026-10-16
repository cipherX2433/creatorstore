const { createClient } = require('@supabase/supabase-js')

const url = 'https://cqympezjstcsaofrzkqa.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeW1wZXpqc3Rjc2FvZnJ6a3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2OTEzMywiZXhwIjoyMTA0MzQ1MTMzfQ.sUKK6EMiy0OSUTSWoDykahPfOylVkKREOTF88hC6fmQ'

const client = createClient(url, key)

async function testRealSignedUrl() {
  const fileId = 'prod_3f12414f-c8a6-40e5-b375-325c457db7f2_1788782632544_Screenshot2026-09-04at11.16.07PM.png'
  
  console.log('Testing createSignedUrl on real Supabase...')
  const { data, error } = await client.storage.from('product-files').createSignedUrl(fileId, 3600)
  console.log('Real createSignedUrl Result:', data, error)
}

testRealSignedUrl().catch(console.error)
