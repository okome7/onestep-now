export type LoginForm = {
  email: string
  password: string
}

export type LoginUser = {
  id: number
  name: string
  email: string
  avatar_key?: string
}

type LoginSuccessResponse = {
  status: 'success'
  data: LoginUser
}

type LoginErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
const invalidLoginMessage = 'メールアドレスまたはパスワードが正しくありません。'

function isPresentString(message: string | undefined): message is string {
  return Boolean(message)
}

export async function login(
  form: LoginForm,
  apiBaseUrl = defaultApiBaseUrl,
): Promise<LoginUser> {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'

  let response: Response

  try {
    response = await fetch(`${trimmedApiBaseUrl.replace(/\/$/, '')}/login`, {
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
    const errors =
      result.status === 'error'
        ? (result.errors ??
          [result.error, result.message].filter(isPresentString))
        : []

    throw new Error(errors.length ? errors.join('\n') : invalidLoginMessage)
  }

  return result.data
}
