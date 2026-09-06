export type SignupForm = {
  name: string
  email: string
  password: string
  passwordConfirmation: string
  avatarKey?: string
}

export type SignupUser = {
  id: number
  name: string
  email: string
  avatar_key?: string
}

type SignupSuccessResponse = {
  status: 'success'
  data: SignupUser
}

type SignupErrorResponse = ApiErrorResponse

type SignupResponse = SignupSuccessResponse | SignupErrorResponse
type SignupEmailCheckResponse = { status: 'success' } | SignupErrorResponse

const japaneseErrorMessages: Record<string, string> = {
  "Name can't be blank": '名前を入力してください。',
  'Email is invalid': 'メールアドレスの形式が正しくありません。',
  "Email can't be blank": 'メールアドレスを入力してください。',
  'Email has already been taken':
    'このメールアドレスはすでに登録されています。',
  "Password can't be blank": 'パスワードを入力してください。',
  'Password は英数字で入力してください':
    'パスワードは英数字で入力してください。',
  'Password は英字と数字を両方含めてください':
    'パスワードは英字と数字を両方含めてください。',
  "Password confirmation doesn't match Password":
    'パスワード確認が一致していません。',
}

function translateSignupError(message: string) {
  if (message.startsWith('Password is too short')) {
    return 'パスワードが短すぎます。'
  }

  return japaneseErrorMessages[message] ?? message
}

export async function checkSignupEmail(
  email: string,
  apiBaseUrl = defaultApiBaseUrl,
) {
  let response: Response

  try {
    response = await apiFetch(buildApiUrl(apiBaseUrl, '/signup/email_check'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          email,
        },
      }),
    })
  } catch {
    throw new Error(
      'APIに接続できませんでした。時間をおいて再度お試しください。',
    )
  }

  const result = await readJsonResponse<SignupEmailCheckResponse>(
    response,
    'APIから想定外の応答が返りました。時間をおいて再度お試しください。',
  )

  if (!response.ok || result.status === 'error') {
    throw new Error(
      apiErrorMessage(
        result as SignupErrorResponse,
        '登録に失敗しました。',
        translateSignupError,
      ),
    )
  }
}

export async function signup(
  form: SignupForm,
  apiBaseUrl = defaultApiBaseUrl,
): Promise<SignupUser> {
  let response: Response

  try {
    response = await apiFetch(buildApiUrl(apiBaseUrl, '/signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.passwordConfirmation,
          avatar_key: form.avatarKey,
        },
      }),
    })
  } catch {
    throw new Error(
      'APIに接続できませんでした。時間をおいて再度お試しください。',
    )
  }

  const result = await readJsonResponse<SignupResponse>(
    response,
    'APIから想定外の応答が返りました。時間をおいて再度お試しください。',
  )

  if (!response.ok || result.status === 'error') {
    throw new Error(
      result.status === 'error'
        ? apiErrorMessage(result, '登録に失敗しました。', translateSignupError)
        : '登録に失敗しました。',
    )
  }

  return result.data
}
import {
  apiErrorMessage,
  apiFetch,
  buildApiUrl,
  defaultApiBaseUrl,
  readJsonResponse,
  type ApiErrorResponse,
} from './apiClient'
