async function testSignedUrl() {
  const { supabaseAdmin } = await import('../lib/supabase.js')
  const fileId = 'prod_3f12414f-c8a6-40e5-b375-325c457db7f2_1788782632544_Screenshot2026-09-04at11.16.07PM.png'
  const fileName = 'Screenshot 2026-09-04 at 11.16.07 PM.png'

  console.log('Testing createSignedUrl with fileName:', fileName)
  const res1 = await supabaseAdmin.storage.from('product-files').createSignedUrl(fileId, 3600, { download: fileName })
  console.log('Res 1:', res1)

  console.log('Testing createSignedUrl without options:')
  const res2 = await supabaseAdmin.storage.from('product-files').createSignedUrl(fileId, 3600)
  console.log('Res 2:', res2)
}

testSignedUrl().catch(console.error)
