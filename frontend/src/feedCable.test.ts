import { afterEach, describe, expect, test, vi } from 'vitest'
import { createConsumer } from '@rails/actioncable'
import type { FeedPost } from './appTypes'
import { applyFeedCableEvent, subscribeToFeedUpdates } from './feedCable'

vi.mock('@rails/actioncable', () => ({ createConsumer: vi.fn() }))

const existingPost: FeedPost = {
  id: '1',
  userName: '既存ユーザー',
  level: 1,
  task: '既存投稿',
  status: 'doing',
  statusLabel: 'やります',
  likes: 0,
  commentsCount: 0,
  comments: [],
  createdAt: 1,
  liked: false,
  commented: false,
  isOwnPost: false,
  canLike: true,
  canComment: true,
}

const createdEvent = {
  type: 'post_created' as const,
  post: {
    id: 2,
    user_id: 7,
    user_name: '投稿者',
    task_title: '新しい投稿',
    card_variant: 'doing' as const,
    is_mine: false,
    can_like: true,
    can_comment: true,
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    created_at: '2026-08-02T00:00:00Z',
  },
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('applyFeedCableEvent', () => {
  test('作成イベントの投稿を一覧の先頭へ追加する', () => {
    const posts = applyFeedCableEvent([existingPost], createdEvent, 7)

    expect(posts.map((post) => post.id)).toEqual(['2', '1'])
    expect(posts[0]).toMatchObject({ userName: 'あなた', isOwnPost: true })
  })

  test('同じ作成イベントを複数回受信しても重複しない', () => {
    const once = applyFeedCableEvent([existingPost], createdEvent, 7)
    const twice = applyFeedCableEvent(once, createdEvent, 7)

    expect(twice.filter((post) => post.id === '2')).toHaveLength(1)
  })

  test('完了イベントで既存の投稿カードを更新する', () => {
    const posts = applyFeedCableEvent(
      [existingPost],
      {
        type: 'post_updated',
        post: {
          ...createdEvent.post,
          id: 1,
          task_title: '既存投稿',
          status_label: 'できた',
          card_variant: 'completed',
        },
      },
    )

    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      id: '1',
      status: 'done',
      statusLabel: 'できた',
    })
  })

  test('一覧にない投稿の完了イベントは追加しない', () => {
    const posts = applyFeedCableEvent([], {
      type: 'post_updated',
      post: { ...createdEvent.post, card_variant: 'completed' },
    })

    expect(posts).toEqual([])
  })

  test('削除イベントで対象投稿を削除する', () => {
    const posts = applyFeedCableEvent([existingPost], {
      type: 'post_deleted',
      post_id: 1,
    })

    expect(posts).toEqual([])
  })

  test('存在しない投稿の削除イベントを安全に無視する', () => {
    expect(() =>
      applyFeedCableEvent([existingPost], {
        type: 'post_deleted',
        post_id: 999,
      }),
    ).not.toThrow()
  })

  test('削除済みIDの遅延した作成イベントを反映しない', () => {
    const posts = applyFeedCableEvent([], createdEvent, 7, new Set(['2']))

    expect(posts).toEqual([])
  })
})

test('切断後に再接続した場合だけ再同期する', () => {
  const callbacks: Record<string, () => void> = {}
  const unsubscribe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal('window', { location: { href: 'http://localhost:5173/' } })
  vi.mocked(createConsumer).mockReturnValue({
    subscriptions: {
      create: vi.fn((_identifier, handlers) => {
        Object.assign(callbacks, handlers)
        return { unsubscribe }
      }),
    },
    disconnect,
  } as never)
  const onReconnect = vi.fn()

  const cleanup = subscribeToFeedUpdates({
    token: 'signed-token',
    cableUrl: 'ws://localhost:3000/cable',
    onEvent: vi.fn(),
    onReconnect,
  })

  callbacks.connected()
  expect(onReconnect).not.toHaveBeenCalled()
  callbacks.disconnected()
  callbacks.connected()
  expect(onReconnect).toHaveBeenCalledOnce()

  cleanup()
  expect(unsubscribe).toHaveBeenCalledOnce()
  expect(disconnect).toHaveBeenCalledOnce()
})
