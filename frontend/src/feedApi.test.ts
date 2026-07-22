import { afterEach, expect, test, vi } from 'vitest'
import {
  AuthRequiredError,
  FeedAccessDeniedError,
  createTask,
  fetchFeed,
} from './feedApi'

afterEach(() => {
  vi.restoreAllMocks()
})

test('本番APIベースURLから/api付きのフィードURLを組み立てる', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: [],
        remaining_seconds: 300,
      }),
  })

  vi.stubGlobal('fetch', fetchMock)

  await fetchFeed(1, 'https://onestep-now.onrender.com')

  expect(fetchMock).toHaveBeenCalledWith(
    'https://onestep-now.onrender.com/api/feed',
    expect.any(Object),
  )
})

test('フィード認証エラーは閲覧不可エラーとして扱う', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          message: '認証が必要です',
        }),
    }),
  )

  await expect(fetchFeed(1, 'http://localhost:3000/api')).rejects.toBeInstanceOf(
    FeedAccessDeniedError,
  )
})

test('フィード閲覧時間外は閲覧不可エラーとして扱う', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'success',
          access_allowed: false,
          remaining_seconds: 0,
          data: [],
        }),
    }),
  )

  await expect(fetchFeed(1, 'http://localhost:3000/api')).rejects.toBeInstanceOf(
    FeedAccessDeniedError,
  )
})

test('タスク開始前の認証エラーは認証必須エラーとして扱う', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          errors: ['認証が必要です'],
        }),
    }),
  )

  await expect(createTask('最初のタスク', 1)).rejects.toBeInstanceOf(
    AuthRequiredError,
  )
})
