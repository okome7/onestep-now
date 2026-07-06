import type { FeedComment, FeedPost, FeedPostStatus } from './appTypes'

type ApiFeedStatus = 'doing' | 'completed'

type ApiComment = {
  id: number
  body: string
  user_name?: string
  level?: number
  post_status_when_commented: ApiFeedStatus
  created_at: string
}

type ApiFeedPost = {
  id: number
  task_title: string
  status_label?: string
  card_variant: ApiFeedStatus
  is_mine: boolean
  can_like: boolean
  can_comment: boolean
  likes_count: number
  comments_count: number
  liked_by_me: boolean
  created_at: string
  comments?: ApiComment[]
  user_name?: string
  level?: number
}

type FeedSuccessResponse = {
  status: 'success'
  data: ApiFeedPost[]
  remaining_seconds?: number
  feed_access_expires_at?: string
}

type TaskResponse = {
  status: 'success'
  data: {
    id: number
    title: string
    completion_post_id?: number
  }
}

type CommentResponse = {
  status: 'success'
  data: ApiComment
}

type ErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class FeedAccessDeniedError extends Error {
  constructor() {
    super('フィード閲覧時間外です。')
  }
}

function apiUrl(apiBaseUrl: string, path: string) {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'
  return `${trimmedApiBaseUrl.replace(/\/$/, '')}${path}`
}

function userHeaders(userId?: number) {
  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'X-User-Id': String(userId) } : {}),
  }
}

function errorMessage(result: ErrorResponse, fallback: string) {
  const errors = result.errors ?? [result.error, result.message].filter(Boolean)
  return errors.length ? errors.join('\n') : fallback
}

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error('APIから想定外の応答が返りました。')
  }

  return (await response.json()) as T
}

function uiStatus(status: ApiFeedStatus): FeedPostStatus {
  return status === 'completed' ? 'done' : 'doing'
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

function mapComment(comment: ApiComment): FeedComment {
  return {
    id: String(comment.id),
    body: comment.body,
    userName: comment.user_name ?? 'みき',
    level: comment.level ?? 7,
    postStatusWhenCommented: uiStatus(comment.post_status_when_commented),
    createdAt: toTimestamp(comment.created_at),
  }
}

function mapPost(post: ApiFeedPost): FeedPost {
  const comments = post.comments?.map(mapComment) ?? []

  return {
    id: String(post.id),
    userName: post.is_mine ? 'あなた' : (post.user_name ?? 'みき'),
    level: post.level ?? 1,
    task: post.task_title,
    status: uiStatus(post.card_variant),
    statusLabel:
      post.status_label ?? (post.card_variant === 'completed' ? 'できた' : 'やります'),
    likes: post.likes_count,
    comments,
    createdAt: toTimestamp(post.created_at),
    liked: post.liked_by_me,
    isOwnPost: post.is_mine,
    canLike: post.can_like,
    canComment: post.can_comment,
  }
}

export async function fetchFeed(userId?: number, apiBaseUrl = defaultApiBaseUrl) {
  let response: Response

  try {
    response = await fetch(apiUrl(apiBaseUrl, '/feed'), {
      headers: userHeaders(userId),
    })
  } catch {
    throw new Error('APIに接続できませんでした。')
  }

  if (response.status === 401 || response.status === 403) {
    throw new FeedAccessDeniedError()
  }

  const result = await readJson<FeedSuccessResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'フィード取得に失敗しました。'))
  }

  const success = result as FeedSuccessResponse
  const remainingSeconds =
    success.remaining_seconds ??
    (success.feed_access_expires_at
      ? Math.max(
          0,
          Math.ceil((toTimestamp(success.feed_access_expires_at) - Date.now()) / 1000),
        )
      : undefined)

  return {
    posts: success.data.map(mapPost),
    remainingSeconds,
    feedAccessExpiresAt: success.feed_access_expires_at,
  }
}

export async function createTask(title: string, userId?: number) {
  const response = await fetch(apiUrl(defaultApiBaseUrl, '/tasks'), {
    method: 'POST',
    headers: userHeaders(userId),
    body: JSON.stringify({ task: { title } }),
  })
  const result = await readJson<TaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'タスク作成に失敗しました。'))
  }

  return (result as TaskResponse).data
}

export async function startTask(taskId: number, userId?: number) {
  const response = await fetch(apiUrl(defaultApiBaseUrl, `/tasks/${taskId}/start`), {
    method: 'PATCH',
    headers: userHeaders(userId),
  })
  const result = await readJson<TaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'タスク開始に失敗しました。'))
  }

  return (result as TaskResponse).data
}

export async function completeTask(taskId: number, userId?: number) {
  const response = await fetch(
    apiUrl(defaultApiBaseUrl, `/tasks/${taskId}/complete`),
    {
      method: 'PATCH',
      headers: userHeaders(userId),
    },
  )
  const result = await readJson<TaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'タスク完了に失敗しました。'))
  }

  return (result as TaskResponse).data
}

export async function likePost(postId: string, userId?: number) {
  const response = await fetch(
    apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/likes`),
    {
      method: 'POST',
      headers: userHeaders(userId),
    },
  )

  if (!response.ok) {
    throw new Error('いいねに失敗しました。')
  }
}

export async function unlikePost(postId: string, userId?: number) {
  const response = await fetch(
    apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/likes`),
    {
      method: 'DELETE',
      headers: userHeaders(userId),
    },
  )

  if (!response.ok) {
    throw new Error('いいね解除に失敗しました。')
  }
}

export async function createComment(
  postId: string,
  body: string,
  userId?: number,
) {
  const response = await fetch(
    apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/comments`),
    {
      method: 'POST',
      headers: userHeaders(userId),
      body: JSON.stringify({ comment: { body } }),
    },
  )
  const result = await readJson<CommentResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'コメント投稿に失敗しました。'))
  }

  return mapComment((result as CommentResponse).data)
}
