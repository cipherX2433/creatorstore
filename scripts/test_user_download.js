async function testUserScenario() {
  const prodId = '3f12414f-c8a6-40e5-b375-325c457db7f2'
  const email = 'mohit.mr11082@gmail.com'

  console.log(`Testing checkout status with product ID ${prodId} and email ${email}...`)
  
  const statusRes = await fetch(`http://localhost:3000/api/checkout/status?order_id=${prodId}&email=${encodeURIComponent(email)}`)
  console.log('Status endpoint HTTP status:', statusRes.status)
  
  const statusData = await statusRes.json()
  console.log('Status Data:', statusData)

  if (!statusRes.ok || statusData.error) {
    throw new Error(`Failed status lookup: ${statusData.error}`)
  }

  console.log('Found orderId:', statusData.orderId)
  console.log('Download URL:', statusData.downloadUrl)

  // Now test download
  if (statusData.downloadUrl) {
    const dlRes = await fetch(`${statusData.downloadUrl}&json=true`)
    console.log('Download API HTTP status:', dlRes.status)
    const dlData = await dlRes.json()
    console.log('Download API Data:', dlData)

    if (dlData.success && dlData.downloadUrl) {
      console.log('Signed URL generated successfully:', dlData.downloadUrl)
    }
  }
}

testUserScenario().catch(console.error)
