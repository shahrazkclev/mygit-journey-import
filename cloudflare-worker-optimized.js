// Optimized Cloudflare Worker for R2 uploads with better progress tracking
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Progress',
        'Access-Control-Expose-Headers': 'X-Upload-Progress',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const isOptimized = formData.get('isOptimized') === 'true'
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // File size validation
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ 
        error: 'File too large', 
        maxSize: maxSize,
        currentSize: file.size 
      }), {
        status: 413,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Generate unique filename with better naming
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 10)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    
    // Add _optimized suffix for compressed videos
    const fileName = isOptimized 
      ? `media-${timestamp}-${randomStr}_optimized.${fileExt}`
      : `media-${timestamp}-${randomStr}.${fileExt}`

    // R2 API endpoint
    const r2Url = `https://api.cloudflare.com/client/v4/accounts/b5f7bbc74ed9bf4c44b19d1f3b937e22/r2/buckets/reviewshigh/objects/${fileName}`
    
    // Start upload with progress tracking simulation
    const startTime = Date.now()
    
    // Upload to R2 with optimized headers
    const r2Response = await fetch(r2Url, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer zmvj6ukdRQN58yGmYwkKYMrDTB_BbPOUTCNrnYH-',
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      },
      body: file,
    })

    const uploadTime = Date.now() - startTime

    if (!r2Response.ok) {
      const errorText = await r2Response.text()
      console.error(`R2 upload failed: ${r2Response.status}`, errorText)
      
      return new Response(JSON.stringify({ 
        error: `R2 upload failed: ${r2Response.status}`,
        details: errorText,
        fileName: fileName
      }), {
        status: r2Response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Return success with public URL and metadata
    const publicUrl = `https://pub-bd7c46a527764dcdad1ab8745369c5e6.r2.dev/${fileName}`
    
    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      fileName: fileName,
      isOptimized: isOptimized,
      fileSize: file.size,
      uploadTime: uploadTime,
      fileType: file.type
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Upload-Speed': `${Math.round(file.size / uploadTime * 1000)} bytes/sec`,
      },
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}