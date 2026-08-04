import { afterEach, expect, test, vi } from 'vitest'
import { apiFetch } from './apiClient'

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
