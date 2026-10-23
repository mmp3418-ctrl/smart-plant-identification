/**
 * Vercel Serverless Function — Pl@ntNet identify proxy
 *
 * Keeps the Pl@ntNet API key on the server and adds CORS headers so the
 * browser SPA can call `/api/identify` without CORS / 403 origin errors.
 *
 * Env (Vercel project settings):
 *   PLANTNET_API_KEY=your_plantnet_key
 */

const PLANTNET_ENDPOINT = 'https://my-api.plantnet.org/v2/identify/all'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' })
  }

  const apiKey = (process.env.PLANTNET_API_KEY || '').trim()
  if (!apiKey) {
    return jsonResponse(500, {
      error:
        'PLANTNET_API_KEY is not configured on the server. Set it in Vercel Environment Variables.',
    })
  }

  const plantNetUrl = new URL(PLANTNET_ENDPOINT)
  plantNetUrl.searchParams.set('api-key', apiKey)
  plantNetUrl.searchParams.set('include-related-images', 'false')
  plantNetUrl.searchParams.set('no-reject', 'true')
  plantNetUrl.searchParams.set('lang', 'en')

  try {
    const inbound = await request.formData()

    // Rebuild FormData for the upstream request (images + organs)
    const outbound = new FormData()
    let hasImage = false

    for (const [key, value] of inbound.entries()) {
      outbound.append(key, value)
      if (key === 'images') hasImage = true
    }

    if (!hasImage) {
      return jsonResponse(400, {
        error: 'Missing FormData field "images".',
      })
    }

    if (!inbound.has('organs')) {
      outbound.append('organs', 'auto')
    }

    const upstream = await fetch(plantNetUrl.toString(), {
      method: 'POST',
      body: outbound,
      // Do not set Content-Type — fetch sets multipart boundary
    })

    const text = await upstream.text()
    const contentType =
      upstream.headers.get('Content-Type') || 'application/json; charset=utf-8'

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown proxy error'
    console.error('[api/identify] proxy error:', message)
    return jsonResponse(502, {
      error: `Pl@ntNet proxy failed: ${message}`,
    })
  }
}
