import type { FeedComment, FeedPost, FeedPostStatus } from './appTypes'
import { apiFetch } from './apiClient'

type ApiFeedStatus = 'doing' | 'completed'

export type ApiComment = {
  id: number
  user_id?: number
  body: string
  user_name?: string
  avatar_key?: string
  level?: number
  post_status_when_commented: ApiFeedStatus
  created_at: string
}

export type ApiFeedPost = {
  id: number
  user_id?: number
  task_title: string
  status_label?: string
  card_variant: ApiFeedStatus
  is_mine: boolean
  can_like: boolean
  can_comment: boolean
  likes_count: number
  comments_count: number
  liked_by_me: boolean
  commented_by_me?: boolean
  created_at: string
  comments?: ApiComment[]
  user_name?: string
  avatar_key?: string
  level?: number
}

type FeedSuccessResponse = {
  status: 'success'
  data: ApiFeedPost[]
  access_allowed?: boolean
  remaining_seconds?: number
  feed_access_expires_at?: string
  pagination?: {
    page: number
    per_page: number
    has_more: boolean
  }
}

export type TaskData = {
  id: number
  title: string
  status: 'pending' | 'active' | 'completed'
  started_at?: string | null
  completed_at?: string | null
  completion_post_id?: number
  completion_post?: {
    id: number
    status: ApiFeedStatus
    status_label: string
    card_variant: ApiFeedStatus
    likes_count?: number
    comments_count?: number
    liked_by_me?: boolean
    comments?: ApiComment[]
    created_at: string
    completed_at?: string | null
  } | null
}

type TaskResponse = {
  status: 'success'
  data: TaskData
}

type ActiveTaskResponse = {
  status: 'success'
  data: TaskData | null
}

type CommentResponse = {
  status: 'success'
  data: ApiComment
}

type CommentsResponse = {
  status: 'success'
  pagination: {
    page: number
    per_page: number
    has_more: boolean
  }
  data: ApiComment[]
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

export class AuthRequiredError extends Error {
  constructor() {
    super('ログインが必要です。')
  }
}

function apiUrl(apiBaseUrl: string, path: string) {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'
  const normalizedApiBaseUrl = trimmedApiBaseUrl.replace(/\/$/, '')
  const apiBasePath = normalizedApiBaseUrl.endsWith('/api')
    ? normalizedApiBaseUrl
    : `${normalizedApiBaseUrl}/api`

  return `${apiBasePath}${path}`
}

function userHeaders(userId?: number) {
  void userId
  return {
    'Content-Type': 'application/json',
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

export function mapFeedComment(comment: ApiComment): FeedComment {
  return {
    id: String(comment.id),
    body: comment.body,
    userName: comment.user_name ?? 'みき',
    avatarId: comment.avatar_key ?? 'avatar-1',
    level: comment.level ?? 7,
    postStatusWhenCommented: uiStatus(comment.post_status_when_commented),
    createdAt: toTimestamp(comment.created_at),
  }
}

export function mapFeedPost(
  post: ApiFeedPost,
  currentUserId?: number,
): FeedPost {
  const comments = post.comments?.map(mapFeedComment) ?? []

  return {
    id: String(post.id),
    userName:
      post.is_mine || post.user_id === currentUserId
        ? 'あなた'
        : (post.user_name ?? 'みき'),
    avatarId: post.avatar_key ?? 'avatar-1',
    level: post.level ?? 1,
    task: post.task_title,
    status: uiStatus(post.card_variant),
    statusLabel:
      post.status_label ??
      (post.card_variant === 'completed' ? 'できた' : 'やります'),
    likes: post.likes_count,
    commentsCount: post.comments_count,
    comments,
    createdAt: toTimestamp(post.created_at),
    liked: post.liked_by_me,
    commented: post.commented_by_me ?? false,
    isOwnPost: post.is_mine || post.user_id === currentUserId,
    canLike: post.can_like,
    canComment: post.can_comment,
  }
}

export async function fetchComments(postId: string, userId?: number, page = 1) {
  const query = page > 1 ? `?page=${page}` : ''
  let response: Response

  try {
    response = await apiFetch(
      apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/comments${query}`),
      { headers: userHeaders(userId) },
    )
  } catch {
    throw new Error('コメントの取得に失敗しました。')
  }

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<CommentsResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(result as ErrorResponse, 'コメントの取得に失敗しました。'),
    )
  }

  const success = result as CommentsResponse

  return {
    comments: success.data.map(mapFeedComment),
    page: success.pagination.page,
    hasMore: success.pagination.has_more,
  }
}

export async function fetchFeed(
  userId?: number,
  apiBaseUrl = defaultApiBaseUrl,
  page = 1,
) {
  let response: Response
  const feedPath = page > 1 ? `/feed?page=${page}` : '/feed'

  try {
    response = await apiFetch(apiUrl(apiBaseUrl, feedPath), {
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
    throw new Error(
      errorMessage(result as ErrorResponse, 'フィード取得に失敗しました。'),
    )
  }

  const success = result as FeedSuccessResponse

  if (success.access_allowed === false) {
    throw new FeedAccessDeniedError()
  }

  const remainingSeconds =
    success.remaining_seconds ??
    (success.feed_access_expires_at
      ? Math.max(
          0,
          Math.ceil(
            (toTimestamp(success.feed_access_expires_at) - Date.now()) / 1000,
          ),
        )
      : undefined)

  return {
    posts: success.data.map((post) => mapFeedPost(post, userId)),
    remainingSeconds,
    feedAccessExpiresAt: success.feed_access_expires_at,
    page: success.pagination?.page ?? page,
    hasMore: success.pagination?.has_more ?? false,
  }
}

export async function createTask(title: string, userId?: number) {
  const response = await apiFetch(apiUrl(defaultApiBaseUrl, '/tasks'), {
    method: 'POST',
    headers: userHeaders(userId),
    body: JSON.stringify({ task: { title } }),
  })

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<TaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(result as ErrorResponse, 'タスク作成に失敗しました。'),
    )
  }

  return (result as TaskResponse).data
}

export async function fetchActiveTask(userId?: number) {
  const response = await apiFetch(apiUrl(defaultApiBaseUrl, '/tasks/active'), {
    headers: userHeaders(userId),
  })

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<ActiveTaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(
        result as ErrorResponse,
        '進行中のタスク取得に失敗しました。',
      ),
    )
  }

  return (result as ActiveTaskResponse).data
}

export async function startTask(taskId: number, userId?: number) {
  const response = await apiFetch(
    apiUrl(defaultApiBaseUrl, `/tasks/${taskId}/start`),
    {
      method: 'PATCH',
      headers: userHeaders(userId),
    },
  )

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<TaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(result as ErrorResponse, 'タスク開始に失敗しました。'),
    )
  }

  return (result as TaskResponse).data
}

export async function completeTask(
  taskId: number,
  userId?: number,
  deferFeedAccess = false,
) {
  const response = await apiFetch(
    apiUrl(defaultApiBaseUrl, `/tasks/${taskId}/complete`),
    {
      method: 'PATCH',
      headers: userHeaders(userId),
      body: JSON.stringify({ defer_feed_access: deferFeedAccess }),
    },
  )

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<TaskResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(result as ErrorResponse, 'タスク完了に失敗しました。'),
    )
  }

  return (result as TaskResponse).data
}

export async function startFeedAccess(userId?: number) {
  const response = await apiFetch(apiUrl(defaultApiBaseUrl, '/feed/access'), {
    method: 'POST',
    headers: userHeaders(userId),
  })
  if (response.status === 401) throw new AuthRequiredError()
  const result = await readJson<FeedSuccessResponse | ErrorResponse>(response)
  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'フィードを開始できませんでした。'))
  }
  return result as FeedSuccessResponse
}

export async function cancelTask(taskId: number, userId?: number) {
  const response = await apiFetch(
    apiUrl(defaultApiBaseUrl, `/tasks/${taskId}`),
    {
      method: 'DELETE',
      headers: userHeaders(userId),
    },
  )

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<{ status: 'success' } | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(result as ErrorResponse, 'タスクの中止に失敗しました。'),
    )
  }
}

export async function likePost(postId: string, userId?: number) {
  const response = await apiFetch(
    apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/likes`),
    {
      method: 'POST',
      headers: userHeaders(userId),
    },
  )

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  if (!response.ok) {
    throw new Error('いいねに失敗しました。')
  }
}

export async function unlikePost(postId: string, userId?: number) {
  const response = await apiFetch(
    apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/likes`),
    {
      method: 'DELETE',
      headers: userHeaders(userId),
    },
  )

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  if (!response.ok) {
    throw new Error('いいね解除に失敗しました。')
  }
}

export async function createComment(
  postId: string,
  body: string,
  userId?: number,
) {
  const response = await apiFetch(
    apiUrl(defaultApiBaseUrl, `/completion_posts/${postId}/comments`),
    {
      method: 'POST',
      headers: userHeaders(userId),
      body: JSON.stringify({ comment: { body } }),
    },
  )

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<CommentResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(
      errorMessage(result as ErrorResponse, 'コメント投稿に失敗しました。'),
    )
  }

  return mapFeedComment((result as CommentResponse).data)
}
