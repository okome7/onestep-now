import { afterEach, expect, test, vi } from 'vitest'
import {
  AuthRequiredError,
  FeedAccessDeniedError,
  createTask,
  fetchComments,
  fetchFeed,
} from './feedApi'

afterEach(() => {
  vi.restoreAllMocks()
})

test('コメントを20件ずつ取得する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        pagination: { page: 2, per_page: 20, has_more: false },
        data: [
          {
            id: 10,
            body: '応援しています',
            user_name: 'ゆい',
            avatar_key: 'avatar-2',
            level: 3,
            post_status_when_commented: 'completed',
            created_at: '2026-08-01T00:00:00Z',
          },
        ],
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const result = await fetchComments('9', 1, 2)

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/completion_posts/9/comments?page=2',
    expect.any(Object),
  )
  expect(result).toMatchObject({
    page: 2,
    hasMore: false,
    comments: [{ body: '応援しています', level: 3 }],
  })
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

test('2ページ目のフィードURLとページ情報を扱う', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: [],
        remaining_seconds: 300,
        pagination: { page: 2, per_page: 20, has_more: true },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const result = await fetchFeed(1, 'https://onestep-now.onrender.com', 2)

  expect(fetchMock).toHaveBeenCalledWith(
    'https://onestep-now.onrender.com/api/feed?page=2',
    expect.any(Object),
  )
  expect(result).toMatchObject({ page: 2, hasMore: true })
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

  await expect(
    fetchFeed(1, 'http://localhost:3000/api'),
  ).rejects.toBeInstanceOf(FeedAccessDeniedError)
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

  await expect(
    fetchFeed(1, 'http://localhost:3000/api'),
  ).rejects.toBeInstanceOf(FeedAccessDeniedError)
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
