import { afterEach, expect, test, vi } from 'vitest'
import {
  resetPassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from './passwordResetApi'

afterEach(() => {
  vi.restoreAllMocks()
})

test('再設定コード送信APIにメールアドレスを送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        message:
          '登録されているメールアドレスの場合、再設定用コードを送信しました',
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    sendPasswordResetCode(
      { email: 'reset@example.com' },
      'http://localhost:3000',
    ),
  ).resolves.toBe(
    '登録されているメールアドレスの場合、再設定用コードを送信しました',
  )

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3000/password_reset',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          email: 'reset@example.com',
        },
      }),
    },
  )
})

test('認証コード確認APIにメールアドレスとコードを送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        message: '認証コードを確認しました',
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    verifyPasswordResetCode(
      { email: 'reset@example.com', code: '123456' },
      'http://localhost:3000',
    ),
  ).resolves.toBe('認証コードを確認しました')

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3000/password_reset/verify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          email: 'reset@example.com',
          code: '123456',
        },
      }),
    },
  )
})

test('パスワード再設定APIに新しいパスワードを送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        message: 'パスワードを再設定しました',
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    resetPassword(
      {
        email: 'reset@example.com',
        code: '123456',
        password: 'newpass1',
        passwordConfirmation: 'newpass1',
      },
      'http://localhost:3000',
    ),
  ).resolves.toBe('パスワードを再設定しました')

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3000/password_reset',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          email: 'reset@example.com',
          code: '123456',
          password: 'newpass1',
          password_confirmation: 'newpass1',
        },
      }),
    },
  )
})

test('APIのパスワードエラーを日本語で返す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['Password は英字と数字を両方含めてください'],
        }),
    }),
  )

  await expect(
    resetPassword(
      {
        email: 'reset@example.com',
        code: '123456',
        password: 'password',
        passwordConfirmation: 'password',
      },
      'http://localhost:3000',
    ),
  ).rejects.toThrow('パスワードは英字と数字を両方含めてください。')
})
