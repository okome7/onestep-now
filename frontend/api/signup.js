export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({
      status: 'error',
      errors: ['この操作は許可されていません。'],
    })
  }

  const apiBaseUrl = (
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    ''
  ).trim()

  if (!apiBaseUrl) {
    return response.status(500).json({
      status: 'error',
      errors: ['APIの接続先が設定されていません。'],
    })
  }

  try {
    const apiResponse = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    })

    const contentType = apiResponse.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      return response.status(502).json({
        status: 'error',
        errors: ['APIから想定外の応答が返りました。'],
      })
    }

    const body = await apiResponse.json()
    return response.status(apiResponse.status).json(body)
  } catch {
    return response.status(502).json({
      status: 'error',
      errors: ['APIに接続できませんでした。'],
    })
  }
}
