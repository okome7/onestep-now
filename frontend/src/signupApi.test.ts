import { afterEach, expect, test, vi } from 'vitest'
import { signup } from './signupApi'

const form = {
  name: 'テスト太郎',
  email: 'test@example.com',
  password: 'password123',
  passwordConfirmation: 'password123',
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('登録フォームの値をAPIに送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: { id: 1, name: form.name, email: form.email },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(signup(form, 'http://localhost:3000')).resolves.toEqual({
    id: 1,
    name: form.name,
    email: form.email,
  })

  expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/signup', {
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
      },
    }),
  })
})

test('API接続先を指定しない場合は同一オリジンのAPI proxyに送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: { id: 1, name: form.name, email: form.email },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await signup(form, '')

  expect(fetchMock).toHaveBeenCalledWith('/api/signup', expect.any(Object))
})

test('APIのバリデーションメッセージを日本語で返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['Email has already been taken', 'Password is too short'],
        }),
    }),
  )

  await expect(signup(form, 'http://localhost:3000/')).rejects.toThrow(
    'このメールアドレスはすでに登録されています。\nパスワードが短すぎます。',
  )
})

test('APIのエラーメッセージがmessageで返った場合も表示する', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          message: 'APIの接続先が設定されていません。',
        }),
    }),
  )

  await expect(signup(form, '/api')).rejects.toThrow(
    'APIの接続先が設定されていません。',
  )
})

test('パスワードの英数字エラーを日本語で返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['Password は英数字で入力してください'],
        }),
    }),
  )

  await expect(signup(form, 'http://localhost:3000/')).rejects.toThrow(
    'パスワードは英数字で入力してください。',
  )
})

test('APIに接続できない場合は接続エラーを返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  )

  await expect(signup(form, 'https://api.example.com')).rejects.toThrow(
    'APIに接続できませんでした。時間をおいて再度お試しください。',
  )
})

test('APIからJSON以外が返った場合は接続先エラーを返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'text/html' }),
      json: () => Promise.resolve({}),
    }),
  )

  await expect(signup(form, 'https://example.com')).rejects.toThrow(
    'APIから想定外の応答が返りました。時間をおいて再度お試しください。',
  )
})
