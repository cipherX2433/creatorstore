async function testStorefrontCards() {
  console.log('Testing Storefront Item Cards & Structure...')
  const res = await fetch('http://localhost:3000/creator-a-collections-2')
  const html = await res.text()

  console.log('HTML status:', res.status)
  console.log('Has <article>:', html.includes('<article'))
  console.log('Has max-w-[540px]:', html.includes('max-w-[540px]'))
  console.log('Has rounded-[36px]:', html.includes('rounded-[36px]'))
  console.log('Has #F4F4F5 background:', html.includes('F4F4F5'))
  console.log('Has rounded-2xl cards:', html.includes('rounded-2xl'))
  console.log('Has bg-white cards:', html.includes('bg-white'))
  console.log('Has Lucide SVG icons:', html.includes('<svg'))

  const cardMatches = (html.match(/bg-white.*?rounded-2xl/g) || []).length
  console.log('Matched white rounded cards in HTML:', cardMatches)
  console.log('Test completed successfully.')
}

testStorefrontCards().catch(console.error)
