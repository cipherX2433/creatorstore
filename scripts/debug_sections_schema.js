import { prisma } from '../lib/prisma.js'
import { supabaseAdmin } from '../lib/supabase.js'

async function debugSchema() {
  console.log('=== DEBUG SECTIONS SCHEMA ===')
  
  // 1. Check Supabase stores table columns
  const { data: store, error: storeErr } = await supabaseAdmin.from('stores').select('*').limit(1)
  console.log('Sample store from DB:', store)

  // 2. Check Supabase store_sections table
  const { data: sections, error: secErr } = await supabaseAdmin.from('store_sections').select('*').limit(5)
  console.log('Sample store_sections from DB:', sections, 'Error:', secErr)

  // 3. Try Prisma query on storeSections
  try {
    const pSections = await prisma.storeSection.findMany({ take: 5 })
    console.log('Prisma storeSection.findMany:', pSections)
  } catch (err) {
    console.error('Prisma storeSection error:', err.message)
  }
}

debugSchema()
