import { createConsumer } from '@rails/actioncable'
import type { FeedPost } from './appTypes'
import { mapFeedComment, mapFeedPost } from './feedApi'
import type { ApiComment, ApiFeedPost } from './feedApi'

export type FeedCableEvent =
  | { type: 'post_created'; post: ApiFeedPost }
  | { type: 'post_updated'; post: ApiFeedPost }
  | { type: 'post_deleted'; post_id: number }
  | {
      type: 'like_created'
      post_id: number
      user_id: number
      likes_count: number
      occurred_at: string
    }
  | {
      type: 'like_deleted'
      post_id: number
      user_id: number
      likes_count: number
      occurred_at: string
    }
  | {
      type: 'comment_created'
      post_id: number
      user_id: number
      comments_count: number
      comment: ApiComment
      occurred_at: string
    }

function hasNumber(data: object, key: string) {
  return key in data && typeof Reflect.get(data, key) === 'number'
}

function isFeedCableEvent(data: unknown): data is FeedCableEvent {
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return false
  }

  if (data.type === 'post_created' || data.type === 'post_updated') {
    return 'post' in data && typeof data.post === 'object' && data.post !== null
  }

  if (data.type === 'like_created' || data.type === 'like_deleted') {
    return (
      hasNumber(data, 'post_id') &&
      hasNumber(data, 'user_id') &&
      hasNumber(data, 'likes_count') &&
      'occurred_at' in data &&
      typeof data.occurred_at === 'string'
    )
  }

  if (data.type === 'comment_created') {
    return (
      hasNumber(data, 'post_id') &&
      hasNumber(data, 'user_id') &&
      hasNumber(data, 'comments_count') &&
      'comment' in data &&
      typeof data.comment === 'object' &&
      data.comment !== null &&
      'occurred_at' in data &&
      typeof data.occurred_at === 'string'
    )
  }

  return (
    data.type === 'post_deleted' &&
    'post_id' in data &&
    typeof data.post_id === 'number'
  )
}

type SubscribeOptions = {
  token: string
  onEvent: (event: FeedCableEvent) => void
  onReconnect: () => void
  cableUrl?: string
}

function defaultCableUrl() {
  const configuredUrl = import.meta.env.VITE_CABLE_URL?.trim()
  if (configuredUrl) {
    return configuredUrl
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/cable`
}

function authenticatedCableUrl(cableUrl: string, token: string) {
  const url = new URL(cableUrl, window.location.href)
  url.protocol =
    url.protocol === 'https:'
      ? 'wss:'
      : url.protocol === 'http:'
        ? 'ws:'
        : url.protocol
  url.searchParams.set('token', token)
  return url.toString()
}

export function applyFeedCableEvent(
  posts: FeedPost[],
  event: FeedCableEvent,
  currentUserId?: number,
  deletedPostIds = new Set<string>(),
  latestLikeEventTimes = new Map<string, number>(),
) {
  if (event.type === 'post_deleted') {
    return posts.filter((post) => post.id !== String(event.post_id))
  }

  if (
    event.type === 'like_created' ||
    event.type === 'like_deleted' ||
    event.type === 'comment_created'
  ) {
    const postId = String(event.post_id)
    const existingPostIndex = posts.findIndex((post) => post.id === postId)

    if (existingPostIndex === -1 || deletedPostIds.has(postId)) {
      return posts
    }

    const nextPosts = [...posts]
    const existingPost = posts[existingPostIndex]

    if (event.type === 'like_created' || event.type === 'like_deleted') {
      const occurredAt = Date.parse(event.occurred_at)
      const latestOccurredAt = latestLikeEventTimes.get(postId)

      if (
        Number.isFinite(occurredAt) &&
        latestOccurredAt !== undefined &&
        occurredAt < latestOccurredAt
      ) {
        return posts
      }

      if (Number.isFinite(occurredAt)) {
        latestLikeEventTimes.set(postId, occurredAt)
      }

      nextPosts[existingPostIndex] = {
        ...existingPost,
        likes: Math.max(0, event.likes_count),
        liked:
          event.user_id === currentUserId
            ? event.type === 'like_created'
            : existingPost.liked,
      }
      return nextPosts
    }

    const receivedComment = mapFeedComment(event.comment)
    const commentsById = new Map(
      [...existingPost.comments, receivedComment].map((comment) => [
        comment.id,
        comment,
      ]),
    )
    const comments = [...commentsById.values()].sort(
      (left, right) =>
        left.createdAt - right.createdAt || left.id.localeCompare(right.id),
    )

    nextPosts[existingPostIndex] = {
      ...existingPost,
      commentsCount: Math.max(
        existingPost.commentsCount,
        event.comments_count,
        0,
      ),
      comments,
      commented:
        event.user_id === currentUserId ? true : existingPost.commented,
    }
    return nextPosts
  }

  const postId = String(event.post.id)
  if (deletedPostIds.has(postId)) {
    return posts
  }

  const existingPostIndex = posts.findIndex((post) => post.id === postId)

  if (event.type === 'post_updated') {
    if (existingPostIndex === -1) {
      return posts
    }

    const nextPosts = [...posts]
    nextPosts[existingPostIndex] = mapFeedPost(event.post, currentUserId)
    return nextPosts
  }

  if (existingPostIndex !== -1) {
    return posts
  }

  return [mapFeedPost(event.post, currentUserId), ...posts]
}

export function subscribeToFeedUpdates({
  token,
  onEvent,
  onReconnect,
  cableUrl = defaultCableUrl(),
}: SubscribeOptions) {
  const consumer = createConsumer(authenticatedCableUrl(cableUrl, token))
  let wasDisconnected = false

  const subscription = consumer.subscriptions.create(
    { channel: 'FeedUpdatesChannel' },
    {
      connected() {
        if (wasDisconnected) {
          wasDisconnected = false
          onReconnect()
        }
      },
      disconnected() {
        wasDisconnected = true
      },
      received(data: unknown) {
        if (isFeedCableEvent(data)) {
          onEvent(data)
        }
      },
    },
  )

  return () => {
    subscription.unsubscribe()
    consumer.disconnect()
  }
}
