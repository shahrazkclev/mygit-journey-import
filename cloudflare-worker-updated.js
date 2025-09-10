// Cloudflare Worker for R2 uploads (Updated for video compression)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const isOptimized = formData.get('isOptimized') === 'true'
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 10)
    const fileExt = file.name.split('.').pop()
    const baseFileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension
    
    // Add _optimized suffix for compressed videos
    const fileName = isOptimized 
      ? `media-${timestamp}-${randomStr}_optimized.${fileExt}`
      : `media-${timestamp}-${randomStr}.${fileExt}`

    // R2 API endpoint
    const r2Url = `https://api.cloudflare.com/client/v4/accounts/b5f7bbc74ed9bf4c44b19d1f3b937e22/r2/buckets/reviewshigh/objects/${fileName}`
    
    // Upload to R2
    const r2Response = await fetch(r2Url, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer zmvj6ukdRQN58yGmYwkKYMrDTB_BbPOUTCNrnYH-',
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!r2Response.ok) {
      const errorText = await r2Response.text()
      return new Response(JSON.stringify({ 
        error: `R2 upload failed: ${r2Response.status} ${errorText}` 
      }), {
        status: r2Response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Return success with public URL
    const publicUrl = `https://pub-bd7c46a527764dcdad1ab8745369c5e6.r2.dev/${fileName}`
    
    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      fileName: fileName,
      isOptimized: isOptimized
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
