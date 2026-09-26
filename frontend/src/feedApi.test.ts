import { afterEach, expect, test, vi } from 'vitest'
import {
  AuthRequiredError,
  FeedAccessDeniedError,
  createTask,
  fetchActiveTask,
  fetchComments,
  fetchFeed,
  mapFeedPost,
  startFeedAccess,
} from './feedApi'

afterEach(() => {
  vi.restoreAllMocks()
})

test('完了済み投稿の表示時刻には完了時刻を使う', () => {
  const createdAt = '2026-08-01T00:00:00Z'
  const completedAt = '2026-08-01T00:30:00Z'

  const post = mapFeedPost({
    id: 1,
    task_title: '完了時刻を表示する',
    card_variant: 'completed',
    is_mine: false,
    can_like: true,
    can_comment: true,
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    created_at: createdAt,
    completed_at: completedAt,
  })

  expect(post.createdAt).toBe(new Date(completedAt).getTime())
})

test('進行中投稿の表示時刻には投稿時刻を使う', () => {
  const createdAt = '2026-08-01T00:00:00Z'

  const post = mapFeedPost({
    id: 1,
    task_title: '投稿時刻を表示する',
    card_variant: 'doing',
    is_mine: false,
    can_like: true,
    can_comment: true,
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    created_at: createdAt,
  })

  expect(post.createdAt).toBe(new Date(createdAt).getTime())
})

test('初回説明を閉じるとフィード閲覧時間を開始する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () => Promise.resolve({ status: 'success', remaining_seconds: 180 }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const result = await startFeedAccess(1)

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/feed/access',
    expect.objectContaining({ method: 'POST' }),
  )
  expect(result.remaining_seconds).toBe(180)
})

test('利用権利がない状態ではフィード閲覧を開始できない', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve({ status: 'error', errors: ['Forbidden'] }),
    }),
  )

  await expect(startFeedAccess(1)).rejects.toBeInstanceOf(
    FeedAccessDeniedError,
  )
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
        remaining_seconds: 180,
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
        remaining_seconds: 180,
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

test('初回説明の開始待ち中は背景表示用フィードとして扱う', async () => {
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
          feed_access_pending: true,
          remaining_seconds: 0,
          pagination: { page: 1, per_page: 20, has_more: true },
          data: [],
        }),
    }),
  )

  await expect(fetchFeed(1, 'http://localhost:3000/api')).resolves.toMatchObject(
    {
      feedAccessPending: true,
      remainingSeconds: 0,
      page: 1,
      hasMore: true,
    },
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

test('進行中タスクと開始時刻を取得する', async () => {
  const startedAt = '2026-08-09T00:00:00Z'
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: {
          id: 10,
          title: '復元するタスク',
          status: 'active',
          started_at: startedAt,
        },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(fetchActiveTask(1)).resolves.toMatchObject({
    id: 10,
    title: '復元するタスク',
    started_at: startedAt,
  })
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/tasks/active',
    expect.any(Object),
  )
})
