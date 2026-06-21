type DeleteAccountParams = {
  id?: number
  email?: string
  name?: string
  avatarKey?: string
}

type DeleteAccountSuccessResponse = {
  status: 'success'
}

type DeleteAccountErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

type DeleteAccountResponse =
  | DeleteAccountSuccessResponse
  | DeleteAccountErrorResponse

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

function isPresentString(message: string | undefined): message is string {
  return Boolean(message)
}

function apiUrl(apiBaseUrl: string) {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'
  return `${trimmedApiBaseUrl.replace(/\/$/, '')}/account`
}

function errorMessageFromResult(result: DeleteAccountErrorResponse) {
  const errors =
    result.errors ?? [result.error, result.message].filter(isPresentString)

  return errors.length ? errors.join('\n') : 'アカウント削除に失敗しました。'
}

export async function deleteAccount(
  params: DeleteAccountParams,
  apiBaseUrl = defaultApiBaseUrl,
) {
  let response: Response

  try {
    response = await fetch(apiUrl(apiBaseUrl), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          id: params.id,
          email: params.email,
          name: params.name,
          avatar_key: params.avatarKey,
        },
      }),
    })
  } catch {
    throw new Error(
      'APIに接続できませんでした。時間をおいて再度お試しください。',
    )
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error(
      'APIから想定外の応答が返りました。時間をおいて再度お試しください。',
    )
  }

  const result = (await response.json()) as DeleteAccountResponse

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessageFromResult(result as DeleteAccountErrorResponse))
  }
}
