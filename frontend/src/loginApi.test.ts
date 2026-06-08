import { afterEach, expect, test, vi } from 'vitest'
import { login } from './loginApi'

const form = {
  email: 'login@example.com',
  password: 'password1',
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('ログインフォームの値をAPIに送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: {
          id: 1,
          name: 'ログイン太郎',
          email: form.email,
          avatar_key: 'avatar-1',
        },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(login(form, 'http://localhost:3000')).resolves.toEqual({
    id: 1,
    name: 'ログイン太郎',
    email: form.email,
    avatar_key: 'avatar-1',
  })

  expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/login', {
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
})

test('認証情報が違う場合はエラーメッセージを返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['メールアドレスまたはパスワードが正しくありません。'],
        }),
    }),
  )

  await expect(login(form, '/api')).rejects.toThrow(
    'メールアドレスまたはパスワードが正しくありません。',
  )
})

test('APIに接続できない場合は接続エラーを返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  )

  await expect(login(form, 'https://api.example.com')).rejects.toThrow(
    'APIに接続できませんでした。時間をおいて再度お試しください。',
  )
})
