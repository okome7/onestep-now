export default async function handler(request, response) {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    response.setHeader('Allow', 'POST, PATCH')
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
    const requestBody =
      typeof request.body === 'string' ? JSON.parse(request.body) : request.body

    const apiResponse = await fetch(
      `${apiBaseUrl.replace(/\/$/, '')}/password_reset`,
      {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    )

    const contentType = apiResponse.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      const bodyText = await apiResponse.text()

      console.error('Password reset API returned a non-JSON response', {
        status: apiResponse.status,
        body: bodyText.slice(0, 500),
      })

      return response.status(502).json({
        status: 'error',
        errors: ['APIから想定外の応答が返りました。'],
      })
    }

    const body = await apiResponse.json()
    return response.status(apiResponse.status).json(body)
  } catch (error) {
    console.error('Password reset proxy failed', error)

    return response.status(502).json({
      status: 'error',
      errors: ['APIに接続できませんでした。'],
    })
  }
}
