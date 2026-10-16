#!/usr/bin/env node
import { supabaseAdmin } from '../lib/supabase.js'

async function migrateUserRoles() {
  console.log('================================================================================')
  console.log('CREATORZERO USER ROLE MIGRATION & AUDIT (SUPABASE POSTGRESQL)')
  console.log('================================================================================')

  const { data: usersData } = await supabaseAdmin.from('users').select('*')
  const users = usersData || []

  let totalUsers = users.length
  let creatorCount = 0
  let customerCount = 0
  let migratedCount = 0

  for (const user of users) {
    let currentRole = user.role

    if (!currentRole || (currentRole !== 'CREATOR' && currentRole !== 'CUSTOMER')) {
      const { data: prods } = await supabaseAdmin.from('products').select('id').eq('creatorId', user.id)
      const { data: stores } = await supabaseAdmin.from('stores').select('id').eq('creatorId', user.id)
      const { data: profile } = await supabaseAdmin.from('creator_profiles').select('creatorId').eq('creatorId', user.id).maybeSingle()

      if ((prods && prods.length > 0) || (stores && stores.length > 0) || profile) {
        currentRole = 'CREATOR'
      } else {
        currentRole = 'CUSTOMER'
      }

      await supabaseAdmin.from('users').update({ role: currentRole, updatedAt: new Date().toISOString() }).eq('id', user.id)
      migratedCount++
    }

    if (currentRole === 'CREATOR') creatorCount++
    else customerCount++
  }

  console.log(`Existing users:                  ${totalUsers}`)
  console.log(`Creators:                        ${creatorCount}`)
  console.log(`Customers:                       ${customerCount}`)
  console.log(`Users requiring role migration:  ${migratedCount}`)
  console.log('================================================================================')
}

migrateUserRoles().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
