import type {
  AchievementComment,
  AchievementLikeUser,
  MyPageData,
  ProfileAchievement,
} from './appTypes'
import { AuthRequiredError } from './feedApi'

type ApiAchievementUser = {
  id: number
  name: string
  level: number
}

type ApiAchievementComment = {
  id: number
  user_name: string
  user_level: number
  avatar_key?: string
  body: string
  created_at: string
}

type ApiAchievement = {
  id: number
  can_delete?: boolean
  task_title: string
  likes_count: number
  comments_count: number
  created_at: string
  liked_users?: ApiAchievementUser[]
  comments?: ApiAchievementComment[]
}

type MyPageSuccessResponse = {
  status: 'success'
  data: {
    level: number
    next_level: number
    remaining_to_next_level: number
    progress_percent: number
    achievements_count: number
    streak_days: number
    likes_count: number
    comments_count: number
    recent_achievements: ApiAchievement[]
    all_achievements: ApiAchievement[]
  }
}

type ErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

function apiUrl(apiBaseUrl: string, path: string) {
  const trimmedApiBaseUrl = apiBaseUrl.trim() || '/api'
  const normalizedApiBaseUrl = trimmedApiBaseUrl.replace(/\/$/, '')
  const apiBasePath = normalizedApiBaseUrl.endsWith('/api')
    ? normalizedApiBaseUrl
    : `${normalizedApiBaseUrl}/api`

  return `${apiBasePath}${path}`
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

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

function mapLikedUser(user: ApiAchievementUser): AchievementLikeUser {
  return {
    name: user.name,
    level: user.level,
    afterComplete: true,
  }
}

function mapComment(comment: ApiAchievementComment): AchievementComment {
  return {
    name: comment.user_name,
    level: comment.user_level,
    afterComplete: true,
    text: comment.body,
    age: new Date(comment.created_at).toISOString(),
  }
}

function mapAchievement(achievement: ApiAchievement): ProfileAchievement {
  return {
    id: String(achievement.id),
    canDelete: achievement.can_delete ?? false,
    task: achievement.task_title,
    likes: achievement.likes_count,
    comments: achievement.comments_count,
    createdAt: toTimestamp(achievement.created_at),
    likedUsers: achievement.liked_users?.map(mapLikedUser) ?? [],
    commentItems: achievement.comments?.map(mapComment) ?? [],
  }
}

export async function fetchMyPage(
  userId?: number,
  apiBaseUrl = defaultApiBaseUrl,
): Promise<MyPageData> {
  let response: Response

  try {
    response = await fetch(apiUrl(apiBaseUrl, '/mypage'), {
      headers: userHeaders(userId),
    })
  } catch {
    throw new Error('APIに接続できませんでした。')
  }

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJson<MyPageSuccessResponse | ErrorResponse>(response)

  if (!response.ok || result.status === 'error') {
    throw new Error(errorMessage(result as ErrorResponse, 'マイページ取得に失敗しました。'))
  }

  const data = (result as MyPageSuccessResponse).data

  return {
    level: data.level,
    nextLevel: data.next_level,
    remainingToNextLevel: data.remaining_to_next_level,
    progressPercent: data.progress_percent,
    achievementsCount: data.achievements_count,
    streakDays: data.streak_days,
    likesCount: data.likes_count,
    commentsCount: data.comments_count,
    recentAchievements: data.recent_achievements.map(mapAchievement),
    allAchievements: data.all_achievements.map(mapAchievement),
  }
}

export async function deleteCompletionPost(
  postId: string,
  userId?: number,
  apiBaseUrl = defaultApiBaseUrl,
) {
  let response: Response

  try {
    response = await fetch(apiUrl(apiBaseUrl, `/completion_posts/${postId}`), {
      method: 'DELETE',
      headers: userHeaders(userId),
    })
  } catch {
    throw new Error('APIに接続できませんでした。')
  }

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  if (response.status === 403) {
    throw new Error('この投稿を削除する権限がありません。')
  }

  if (!response.ok) {
    const result = await readJson<ErrorResponse>(response)
    throw new Error(errorMessage(result, '投稿の削除に失敗しました。'))
  }
}
