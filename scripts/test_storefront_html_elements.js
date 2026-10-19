async function checkHtml() {
  const res = await fetch('http://localhost:3000/mohit1')
  const html = await res.text()

  console.log('Status:', res.status)
  console.log('HTML size:', html.length)

  // Check key markers of the default design
  const checks = [
    { name: 'Contains centered container or max-w-[540px]', pass: html.includes('max-w-[540px]') },
    { name: 'Contains rounded-[36px] container', pass: html.includes('rounded-[36px]') },
    { name: 'Uses light surface #F4F4F5', pass: html.includes('F4F4F5') || html.includes('bg-[#F4F4F5]') },
    { name: 'Contains CreatorStoreMark', pass: html.includes('CreatorStoreMark') || html.includes('aria-label="CreatorStore"') },
    { name: 'Contains Share2 or share button', pass: html.includes('Share store') || html.includes('lucide-share-2') || html.includes('share') },
    { name: 'Contains profile avatar circle', pass: html.includes('rounded-full') },
  ]

  console.log('\n--- DOM / Component Elements Check ---')
  for (const c of checks) {
    console.log(`${c.pass ? '✅' : '❌'} ${c.name}`)
  }

  // Print head and main structure snippet
  console.log('\nSnippet of rendered HTML (first 1000 chars):')
  console.log(html.slice(0, 1000))
}

checkHtml().catch(console.error)
