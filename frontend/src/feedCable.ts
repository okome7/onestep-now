import { createConsumer } from '@rails/actioncable'
import type { FeedPost } from './appTypes'
import { mapFeedPost } from './feedApi'
import type { ApiFeedPost } from './feedApi'

export type FeedCableEvent =
  | { type: 'post_created'; post: ApiFeedPost }
  | { type: 'post_updated'; post: ApiFeedPost }
  | { type: 'post_deleted'; post_id: number }

function isFeedCableEvent(data: unknown): data is FeedCableEvent {
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return false
  }

  if (data.type === 'post_created' || data.type === 'post_updated') {
    return 'post' in data && typeof data.post === 'object' && data.post !== null
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
) {
  if (event.type === 'post_deleted') {
    return posts.filter((post) => post.id !== String(event.post_id))
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
