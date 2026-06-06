export type SignupPayload = {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

export type SignupSuccessResponse = {
  status: 'success'
  data: {
    id: number
    name: string
    email: string
  }
}

export type SignupErrorResponse = {
  status: 'error'
  errors: string[]
}

export type SignupResponse = SignupSuccessResponse | SignupErrorResponse

type Fetch = typeof fetch

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function signup(
  payload: SignupPayload,
  fetcher: Fetch = fetch,
): Promise<SignupResponse> {
  const response = await fetcher(`${apiBaseUrl}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user: {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      },
    }),
  })

  const json = (await response.json()) as SignupResponse

  if (!response.ok && json.status !== 'error') {
    throw new Error('ユーザー登録に失敗しました。')
  }

  return json
}
