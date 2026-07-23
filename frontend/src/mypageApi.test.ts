import { afterEach, expect, test, vi } from 'vitest'
import { deleteCompletionPost } from './mypageApi'

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
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '7',
      },
    },
  )
})

test('他のユーザーの投稿は権限エラーを表示する', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status: 403 }),
  )

  await expect(
    deleteCompletionPost('42', 7, 'https://api.example.com'),
  ).rejects.toThrow('この投稿を削除する権限がありません。')
})
