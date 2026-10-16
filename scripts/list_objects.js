const { createClient } = require('@supabase/supabase-js')

const url = 'https://cqympezjstcsaofrzkqa.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeW1wZXpqc3Rjc2FvZnJ6a3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2OTEzMywiZXhwIjoyMTA0MzQ1MTMzfQ.sUKK6EMiy0OSUTSWoDykahPfOylVkKREOTF88hC6fmQ'

const client = createClient(url, key)

async function listRealObjects() {
  const { data, error } = await client.storage.from('product-files').list()
  console.log('Objects in product-files bucket:', data, error)
}

listRealObjects().catch(console.error)
