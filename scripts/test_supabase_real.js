const { createClient } = require('@supabase/supabase-js')

const url = 'https://cqympezjstcsaofrzkqa.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeW1wZXpqc3Rjc2FvZnJ6a3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2OTEzMywiZXhwIjoyMTA0MzQ1MTMzfQ.sUKK6EMiy0OSUTSWoDykahPfOylVkKREOTF88hC6fmQ'

const client = createClient(url, key)

async function testStorage() {
  const { data: buckets, error: bErr } = await client.storage.listBuckets()
  console.log('Buckets in real Supabase:', buckets ? buckets.map(b => ({ name: b.name, public: b.public })) : bErr)
  
  if (buckets) {
    for (const b of buckets) {
      const { data: files, error: fErr } = await client.storage.from(b.name).list()
      console.log(`Files in bucket '${b.name}':`, files ? files.map(f => f.name) : fErr)
    }
  }
}

testStorage().catch(console.error)
