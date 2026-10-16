const { createClient } = require('@supabase/supabase-js')

const url = 'https://cqympezjstcsaofrzkqa.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeW1wZXpqc3Rjc2FvZnJ6a3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2OTEzMywiZXhwIjoyMTA0MzQ1MTMzfQ.sUKK6EMiy0OSUTSWoDykahPfOylVkKREOTF88hC6fmQ'

const client = createClient(url, key)

async function uploadDsaProductFile() {
  const fileId = 'prod_3f12414f-c8a6-40e5-b375-325c457db7f2_1788782632544_Screenshot2026-09-04at11.16.07PM.png'
  
  // Real PNG image buffer
  const imageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )

  console.log(`Uploading ${fileId} to real Supabase Storage product-files bucket...`)
  const { data, error } = await client.storage
    .from('product-files')
    .upload(fileId, imageBuffer, { contentType: 'image/png', upsert: true })

  if (error) {
    console.error('Upload Error:', error)
  } else {
    console.log('Upload Success:', data)
  }
}

uploadDsaProductFile().catch(console.error)
