import { afterEach, expect, test, vi } from 'vitest'
import { updateProfile } from './profileApi'

afterEach(() => vi.restoreAllMocks())

test('変更したプロフィールを永続化APIへ送信する', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        status: 'success',
        data: {
          id: 1,
          name: '変更後',
          email: 'user@example.com',
          avatar_key: 'avatar-5',
        },
      }),
  })
  vi.stubGlobal('fetch', fetchMock)

  await updateProfile({ name: '変更後', avatarKey: 'avatar-5' }, '/api')
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/profile',
    expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({
        user: { name: '変更後', avatar_key: 'avatar-5' },
      }),
    }),
  )
})
