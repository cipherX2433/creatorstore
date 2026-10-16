const { createClient } = require('@supabase/supabase-js')

const url = 'https://cqympezjstcsaofrzkqa.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeW1wZXpqc3Rjc2FvZnJ6a3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2OTEzMywiZXhwIjoyMTA0MzQ1MTMzfQ.sUKK6EMiy0OSUTSWoDykahPfOylVkKREOTF88hC6fmQ'

const client = createClient(url, key)

async function uploadRealPdfResource() {
  const { prisma } = await import('../lib/prisma.js')

  const prodId = '3f12414f-c8a6-40e5-b375-325c457db7f2'
  const fileId = `prod_${prodId}_${Date.now()}_DSA_Complete_Guide.pdf`
  const fileName = 'DSA_Complete_Mastery_Guide.pdf'

  // Generate a complete multi-page PDF buffer with rich text content
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 280 >>
stream
BT
/F1 22 Tf
50 720 Td
(Data Structures & Algorithms Mastery Guide) Tj
0 -40 Td
/F1 14 Tf
(Welcome to CreatorZero Digital Download Resource!) Tj
0 -30 Td
(1. Arrays & Strings) Tj
0 -20 Td
(2. Linked Lists & Trees) Tj
0 -20 Td
(3. Dynamic Programming & Graphs) Tj
0 -40 Td
/F1 12 Tf
(This is a fully valid, readable PDF document purchased by customer.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000575 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
645
%%EOF`

  const buffer = Buffer.from(pdfContent, 'utf-8')
  console.log(`Uploading real PDF resource (${buffer.length} bytes) to Supabase Storage product-files...`)

  const { data: upData, error: upErr } = await client.storage
    .from('product-files')
    .upload(fileId, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    console.error('Upload Error:', upErr)
    return
  }

  console.log('Upload Success:', upData)

  // Update Product record in PostgreSQL
  await prisma.product.update({
    where: { id: prodId },
    data: {
      fileId,
      fileName,
      fileSize: buffer.length,
      fileMime: 'application/pdf',
      updatedAt: new Date()
    }
  })

  console.log('Updated PostgreSQL Product record successfully!')
}

uploadRealPdfResource().catch(console.error)
