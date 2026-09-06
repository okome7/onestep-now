import { afterEach, expect, test, vi } from 'vitest'
import {
  apiErrorMessage,
  apiFetch,
  buildApiUrl,
  readJsonResponse,
} from './apiClient'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('認証Cookieを含め、X-User-Idを付けずに送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
  vi.stubGlobal('fetch', fetchMock)

  await apiFetch('/api/feed', { headers: { Accept: 'application/json' } })

  expect(fetchMock).toHaveBeenCalledWith('/api/feed', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('X-User-Id')
})

test('状態変更時はCookieのCSRFトークンをヘッダーへ設定する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('document', { cookie: 'onestep_csrf=verified-token' })

  await apiFetch('/api/tasks', { method: 'POST' })

  const headers = fetchMock.mock.calls[0][1].headers as Headers
  expect(headers.get('X-CSRF-Token')).toBe('verified-token')
})

test('APIベースURLとパスを正規化する', () => {
  expect(buildApiUrl('/api/', '/session')).toBe('/api/session')
  expect(
    buildApiUrl('https://backend.example.com/', '/feed', {
      ensureApiPath: true,
    }),
  ).toBe('https://backend.example.com/api/feed')
  expect(
    buildApiUrl('https://backend.example.com/api', '/feed', {
      ensureApiPath: true,
    }),
  ).toBe('https://backend.example.com/api/feed')
})

test('APIエラーの優先順位とフォールバックを統一する', () => {
  expect(
    apiErrorMessage(
      { status: 'error', errors: ['1件目', '2件目'], message: '未使用' },
      '失敗しました。',
    ),
  ).toBe('1件目\n2件目')
  expect(apiErrorMessage({ status: 'error' }, '失敗しました。')).toBe(
    '失敗しました。',
  )
})

test('JSON以外のAPIレスポンスを拒否する', async () => {
  const response = new Response('<html></html>', {
    headers: { 'Content-Type': 'text/html' },
  })

  await expect(readJsonResponse(response)).rejects.toThrow(
    'APIから想定外の応答が返りました。',
  )
})
