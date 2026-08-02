import type { LoginForm } from './loginApi'
import type { PasswordResetForm } from './passwordResetApi'
import type { SignupForm } from './signupApi'

export type FieldErrors = Partial<Record<keyof SignupForm, string>>
export type LoginFieldErrors = Partial<Record<keyof LoginForm, string>>
export type PasswordResetFieldErrors = Partial<
  Record<keyof PasswordResetForm, string>
>
export type PasswordResetStep = 'email' | 'code' | 'password'
export type SignupScreen = 'signup' | 'icon' | 'complete'

export type FeedPostStatus = 'doing' | 'done'

export type FeedComment = {
  id: string
  body: string
  userName: string
  avatarId: string
  level: number
  postStatusWhenCommented: FeedPostStatus
  createdAt: number
}

export type FeedPost = {
  id: string
  userName: string
  level: number
  task: string
  status: FeedPostStatus
  statusLabel: string
  likes: number
  commentsCount: number
  comments: FeedComment[]
  createdAt: number
  liked: boolean
  commented: boolean
  isOwnPost: boolean
  canLike: boolean
  canComment: boolean
}

export type ProfileAchievement = {
  id: string
  canDelete: boolean
  task: string
  likes: number
  comments: number
  createdAt: number
  likedUsers: AchievementLikeUser[]
  commentItems: AchievementComment[]
}

export type AchievementDetailTab = 'likes' | 'comments'

export type AchievementLikeUser = {
  name: string
  level: number
  afterComplete: boolean
}

export type AchievementComment = AchievementLikeUser & {
  text: string
  age: string
}

export type CompleteProfile = {
  id?: number
  name: string
  email?: string
  avatarId: string
  cableToken?: string
}

export type MyPageData = {
  level: number
  nextLevel: number
  remainingToNextLevel: number
  progressPercent: number
  achievementsCount: number
  streakDays: number
  likesCount: number
  commentsCount: number
  recentAchievements: ProfileAchievement[]
  allAchievements: ProfileAchievement[]
}
