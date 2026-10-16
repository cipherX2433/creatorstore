const { createClient } = require('@supabase/supabase-js')

const url = 'https://cqympezjstcsaofrzkqa.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeW1wZXpqc3Rjc2FvZnJ6a3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2OTEzMywiZXhwIjoyMTA0MzQ1MTMzfQ.sUKK6EMiy0OSUTSWoDykahPfOylVkKREOTF88hC6fmQ'

const client = createClient(url, key)

async function testBucket() {
  console.log('Ensuring product-files bucket...')
  const { data: buckets } = await client.storage.listBuckets()
  const exists = buckets && buckets.some(b => b.name === 'product-files')
  
  if (!exists) {
    console.log('Creating private bucket product-files...')
    const { data, error } = await client.storage.createBucket('product-files', { public: false })
    if (error) console.error('Error creating bucket:', error)
    else console.log('Bucket created successfully:', data)
  } else {
    console.log('Bucket product-files already exists.')
  }

  // Upload test file
  const testBuffer = Buffer.from('PDF MOCK FILE CONTENT FOR TEST', 'utf-8')
  const testFileId = `test_file_${Date.now()}.pdf`
  console.log(`Uploading test file ${testFileId}...`)
  const { data: upData, error: upErr } = await client.storage.from('product-files').upload(testFileId, testBuffer, { contentType: 'application/pdf' })
  console.log('Upload result:', upData, upErr)

  // Test signed URL
  console.log('Generating signed URL...')
  const { data: signedData, error: signedErr } = await client.storage.from('product-files').createSignedUrl(testFileId, 3600)
  console.log('Signed URL result:', signedData, signedErr)

  // Test download
  console.log('Downloading file back...')
  const { data: dlData, error: dlErr } = await client.storage.from('product-files').download(testFileId)
  console.log('Download result:', dlData ? `Downloaded ${dlData.byteLength || dlData.length} bytes: ${dlData.toString()}` : 'ERROR', dlErr)
}

testBucket().catch(console.error)
