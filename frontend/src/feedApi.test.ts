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
      ok: false,
      status: 403,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          status: 'error',
          message: 'フィード閲覧時間外です',
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
