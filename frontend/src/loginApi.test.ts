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
          name: 'ログインユーザー',
          email: form.email,
        },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(login(form, 'http://localhost:3000')).resolves.toEqual({
    id: 1,
    name: 'ログインユーザー',
    email: form.email,
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

test('認証エラーを表示用メッセージとして返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['メールアドレスまたはパスワードが違います'],
        }),
    }),
  )

  await expect(login(form, 'http://localhost:3000')).rejects.toThrow(
    'メールアドレスまたはパスワードが違います',
  )
})

test('APIの英語エラーを日本語で返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['Invalid email or password'],
        }),
    }),
  )

  await expect(login(form, 'http://localhost:3000')).rejects.toThrow(
    'メールアドレスまたはパスワードが違います',
  )
})

test('APIが一時的に落ちている場合は接続エラーを返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    }),
  )

  await expect(login(form, 'http://localhost:3000')).rejects.toThrow(
    'APIに接続できませんでした。時間をおいて再度お試しください。',
  )
})
