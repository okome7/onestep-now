export type PasswordResetEmailForm = {
  email: string
}

export type PasswordResetCodeForm = PasswordResetEmailForm & {
  code: string
}

export type PasswordResetForm = PasswordResetCodeForm & {
  password: string
  passwordConfirmation: string
}

type PasswordResetSuccessResponse = {
  status: 'success'
  message?: string
}

type PasswordResetErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

type PasswordResetResponse =
  | PasswordResetSuccessResponse
  | PasswordResetErrorResponse

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

const japaneseErrorMessages: Record<string, string> = {
  NotFound: '再設定用APIが見つかりませんでした。',
  'Not Found': '再設定用APIが見つかりませんでした。',
  'Email is invalid': 'メールアドレスの形式が正しくありません。',
  "Email can't be blank": 'メールアドレスを入力してください。',
  "Password can't be blank": 'パスワードを入力してください。',
  'Password は英数字で入力してください':
    'パスワードは英数字で入力してください。',
  'Password は英字と数字を両方含めてください':
    'パスワードは英字と数字を両方含めてください。',
  "Password confirmation doesn't match Password":
    'パスワード確認が一致していません。',
}

function translatePasswordResetError(message: string) {
  if (message.startsWith('Password is too short')) {
    return 'パスワードが短すぎます。'
  }

  return japaneseErrorMessages[message] ?? message
}

function isPresentString(message: string | undefined): message is string {
  return Boolean(message)
}

function apiUrl(apiBaseUrl: string, path: string) {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'
  return `${trimmedApiBaseUrl.replace(/\/$/, '')}${path}`
}

function errorMessageFromResult(
  result: PasswordResetErrorResponse,
  fallbackMessage: string,
) {
  const errors =
    result.errors ?? [result.error, result.message].filter(isPresentString)

  return errors.length
    ? errors.map(translatePasswordResetError).join('\n')
    : fallbackMessage
}

async function requestPasswordReset(
  path: string,
  method: 'POST' | 'PATCH',
  user: Record<string, string>,
  fallbackMessage: string,
  apiBaseUrl = defaultApiBaseUrl,
) {
  let response: Response

  try {
    response = await fetch(apiUrl(apiBaseUrl, path), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user }),
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

  const result = (await response.json()) as PasswordResetResponse

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessageFromResult(
        result as PasswordResetErrorResponse,
        fallbackMessage,
      ),
    )
  }

  return result.message ?? ''
}

export function sendPasswordResetCode(
  form: PasswordResetEmailForm,
  apiBaseUrl = defaultApiBaseUrl,
) {
  return requestPasswordReset(
    '/password_reset',
    'POST',
    { email: form.email },
    '再設定用コードの送信に失敗しました。',
    apiBaseUrl,
  )
}

export function verifyPasswordResetCode(
  form: PasswordResetCodeForm,
  apiBaseUrl = defaultApiBaseUrl,
) {
  return requestPasswordReset(
    '/password_reset/verify',
    'POST',
    {
      email: form.email,
      code: form.code,
    },
    '認証コードの確認に失敗しました。',
    apiBaseUrl,
  )
}

export function resetPassword(
  form: PasswordResetForm,
  apiBaseUrl = defaultApiBaseUrl,
) {
  return requestPasswordReset(
    '/password_reset',
    'PATCH',
    {
      email: form.email,
      code: form.code,
      password: form.password,
      password_confirmation: form.passwordConfirmation,
    },
    'パスワードの再設定に失敗しました。',
    apiBaseUrl,
  )
}
