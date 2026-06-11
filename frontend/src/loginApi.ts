export type LoginForm = {
  email: string
  password: string
}

type LoginSuccessResponse = {
  status: 'success'
  data: {
    id: number
    name: string
    email: string
    avatar_key?: string
  }
}

type LoginErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

function isPresentString(message: string | undefined): message is string {
  return Boolean(message)
}

function apiUrl(apiBaseUrl: string) {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'
  return `${trimmedApiBaseUrl.replace(/\/$/, '')}/login`
}

function errorMessageFromResult(result: LoginErrorResponse) {
  const errors =
    result.errors ?? [result.error, result.message].filter(isPresentString)

  return errors.length
    ? errors.join('\n')
    : 'メールアドレスまたはパスワードが違います'
}

export async function login(form: LoginForm, apiBaseUrl = defaultApiBaseUrl) {
  let response: Response

  try {
    response = await fetch(apiUrl(apiBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          email: form.email,
          password: form.password,
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

  const result = (await response.json()) as LoginResponse

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessageFromResult(result as LoginErrorResponse))
  }

  return result.data
}
