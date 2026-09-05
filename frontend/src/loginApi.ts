import {
  apiErrorMessage,
  apiFetch,
  buildApiUrl,
  defaultApiBaseUrl,
  readJsonResponse,
  type ApiErrorResponse,
} from './apiClient'

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

type LoginErrorResponse = ApiErrorResponse

type LoginResponse = LoginSuccessResponse | LoginErrorResponse

const loginAuthErrorMessage = 'メールアドレスまたはパスワードが違います'

const japaneseErrorMessages: Record<string, string> = {
  'Invalid email or password': loginAuthErrorMessage,
  'Invalid Email or password': loginAuthErrorMessage,
  'Email or password is invalid': loginAuthErrorMessage,
  Unauthorized: loginAuthErrorMessage,
}

function translateLoginError(message: string) {
  return japaneseErrorMessages[message] ?? message
}

export async function login(form: LoginForm, apiBaseUrl = defaultApiBaseUrl) {
  let response: Response

  try {
    response = await apiFetch(buildApiUrl(apiBaseUrl, '/login'), {
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

  const unexpectedResponseMessage =
    response.status >= 500
      ? 'APIに接続できませんでした。時間をおいて再度お試しください。'
      : 'APIから想定外の応答が返りました。時間をおいて再度お試しください。'
  const result = await readJsonResponse<LoginResponse>(
    response,
    unexpectedResponseMessage,
  )

  if (!response.ok || result.status === 'error') {
    throw new Error(
      apiErrorMessage(
        result as LoginErrorResponse,
        loginAuthErrorMessage,
        translateLoginError,
      ),
    )
  }

  return result.data
}
