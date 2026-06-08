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

type SignupErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

type SignupResponse = SignupSuccessResponse | SignupErrorResponse

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

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

function isPresentString(message: string | undefined): message is string {
  return Boolean(message)
}

export async function signup(
  form: SignupForm,
  apiBaseUrl = defaultApiBaseUrl,
): Promise<SignupUser> {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'

  let response: Response

  try {
    response = await fetch(`${trimmedApiBaseUrl.replace(/\/$/, '')}/signup`, {
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

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error(
      'APIから想定外の応答が返りました。時間をおいて再度お試しください。',
    )
  }

  const result = (await response.json()) as SignupResponse

  if (!response.ok || result.status === 'error') {
    const errors =
      result.status === 'error'
        ? (result.errors ??
          [result.error, result.message].filter(isPresentString))
        : []

    throw new Error(
      errors.length
        ? errors.map(translateSignupError).join('\n')
        : '登録に失敗しました。',
    )
  }

  return result.data
}
