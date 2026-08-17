import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSession } from './sessionApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchSession', () => {
  it('正常レスポンスのユーザーを返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'success',
            data: { id: 1, name: 'おこめ', email: 'okome@example.com' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(fetchSession()).resolves.toMatchObject({
      id: 1,
      name: 'おこめ',
    })
  })

  it('バックエンドのエラーレスポンスを再試行可能なエラーとして扱う', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    )

    await expect(fetchSession()).rejects.toThrow(
      'セッションの確認に失敗しました。',
    )
  })
})
