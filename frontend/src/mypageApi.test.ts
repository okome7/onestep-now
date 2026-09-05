import { afterEach, expect, test, vi } from 'vitest'
import {
  deleteCompletionPost,
  fetchMyPage,
  isAbortError,
  isCurrentMyPageResponse,
} from './mypageApi'

afterEach(() => {
  vi.restoreAllMocks()
})

test('自分の投稿を削除APIへ送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
  vi.stubGlobal('fetch', fetchMock)

  await deleteCompletionPost('42', 7, 'https://api.example.com')

  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.example.com/api/completion_posts/42',
    {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    },
  )
})

test('他のユーザーの投稿は権限エラーを表示する', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))

  await expect(
    deleteCompletionPost('42', 7, 'https://api.example.com'),
  ).rejects.toThrow('この投稿を削除する権限がありません。')
})

test('マイページ取得にAbortSignalを渡す', async () => {
  const controller = new AbortController()
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: {
          user: { id: 7, name: 'みき', avatar_key: 'avatar-2' },
          level: 0,
          next_level: 1,
          remaining_to_next_level: 10,
          progress_percent: 0,
          achievements_count: 0,
          streak_days: 0,
          likes_count: 0,
          comments_count: 0,
          recent_achievements: [],
          all_achievements: [],
        },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const result = await fetchMyPage(
    7,
    'https://api.example.com',
    controller.signal,
  )

  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.example.com/api/users/7/mypage',
    expect.objectContaining({ signal: controller.signal }),
  )
  expect(result.user).toEqual({ id: 7, name: 'みき', avatarId: 'avatar-2' })
})

test('AbortErrorは接続エラーへ変換しない', async () => {
  const abortError = new Error('aborted')
  abortError.name = 'AbortError'
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

  await expect(fetchMyPage(7)).rejects.toSatisfy(isAbortError)
})

test('現在のユーザーとリクエストに一致するレスポンスだけを反映対象にする', () => {
  const controller = new AbortController()

  expect(isCurrentMyPageResponse(7, 7, 3, 3, controller.signal)).toBe(true)
  expect(isCurrentMyPageResponse(7, 8, 3, 3, controller.signal)).toBe(false)
  expect(isCurrentMyPageResponse(7, 7, 2, 3, controller.signal)).toBe(false)

  controller.abort()
  expect(isCurrentMyPageResponse(7, 7, 3, 3, controller.signal)).toBe(false)
})
