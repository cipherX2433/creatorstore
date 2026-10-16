async function inspectPageError() {
  const url = 'http://localhost:3000/checkout/success/3f12414f-c8a6-40e5-b375-325c457db7f2?email=mohit.mr11082%40gmail.com'
  console.log('Fetching page:', url)
  const res = await fetch(url)
  console.log('Status:', res.status)
  const text = await res.text()
  console.log('Is HTML:', text.includes('<!DOCTYPE html>'))
  if (text.includes('Error') || text.includes('error')) {
    const errorMatches = text.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
    if (errorMatches) {
      console.log('NEXT DATA snippet:', errorMatches[1].slice(0, 500))
    }
  }
}

inspectPageError().catch(console.error)
