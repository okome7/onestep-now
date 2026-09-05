import type {
  AchievementComment,
  AchievementLikeUser,
  MyPageData,
  ProfileAchievement,
} from './appTypes'
import { AuthRequiredError } from './feedApi'
import {
  apiErrorMessage,
  apiFetch,
  buildApiUrl,
  defaultApiBaseUrl,
  readJsonResponse,
  type ApiErrorResponse,
} from './apiClient'

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
    user?: {
      id: number
      name: string
      avatar_key?: string
    }
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

type ErrorResponse = ApiErrorResponse

function apiUrl(apiBaseUrl: string, path: string) {
  return buildApiUrl(apiBaseUrl, path, { ensureApiPath: true })
}

function userHeaders(userId?: number) {
  void userId
  return {
    'Content-Type': 'application/json',
  }
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
  signal?: AbortSignal,
): Promise<MyPageData> {
  let response: Response

  try {
    response = await apiFetch(apiUrl(apiBaseUrl, `/mypage?user_id=${userId}`), {
      headers: userHeaders(userId),
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    throw new Error('APIに接続できませんでした。')
  }

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  const result = await readJsonResponse<MyPageSuccessResponse | ErrorResponse>(
    response,
  )

  if (!response.ok || result.status === 'error') {
    throw new Error(
      apiErrorMessage(
        result as ErrorResponse,
        'マイページ取得に失敗しました。',
      ),
    )
  }

  const data = (result as MyPageSuccessResponse).data

  return {
    user: {
      id: data.user?.id ?? userId ?? 0,
      name: data.user?.name ?? '',
      avatarId: data.user?.avatar_key ?? 'avatar-1',
    },
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

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export function isCurrentMyPageResponse(
  requestUserId: number,
  currentUserId: number | undefined,
  requestId: number,
  activeRequestId: number,
  signal: AbortSignal,
) {
  return (
    !signal.aborted &&
    requestUserId === currentUserId &&
    requestId === activeRequestId
  )
}

export async function deleteCompletionPost(
  postId: string,
  userId?: number,
  apiBaseUrl = defaultApiBaseUrl,
) {
  let response: Response

  try {
    response = await apiFetch(
      apiUrl(apiBaseUrl, `/completion_posts/${postId}`),
      {
        method: 'DELETE',
        headers: userHeaders(userId),
      },
    )
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
    const result = await readJsonResponse<ErrorResponse>(response)
    throw new Error(apiErrorMessage(result, '投稿の削除に失敗しました。'))
  }
}
