import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import { deleteAccount } from '../accountApi'
import {
  avatarOptions,
  customPhotoIconId,
  feedViewDurationSeconds,
  signupCompleteStorageKey,
  signupDraftStorageKey,
  signupScreenStorageKey,
} from '../appConstants'
import {
  clearAuthSession,
  createAvatarImageDataUrl,
  formatElapsedTime,
  formatFeedPostAge,
  formatFeedRemainingTime,
  getAvatarSrc,
  getCompleteAvatarSrc,
  getInitialCompleteProfile,
  isAvatarImageDataUrl,
  saveCompleteProfile,
} from '../appHelpers'
import type {
  AchievementDetailTab,
  FeedComment,
  FeedPost,
  MyPageData,
} from '../appTypes'
import achievementCheckIcon from '../assets/icons/achievement-check.svg'
import achievementFlameIcon from '../assets/icons/achievement-flame.svg'
import cameraIcon from '../assets/icons/camera.svg'
import commentIcon from '../assets/icons/comment.svg'
import commentActiveIcon from '../assets/icons/comment-active.svg'
import feedExpiredClockIcon from '../assets/icons/feed-expired-clock.svg'
import iconGridIcon from '../assets/icons/icon-grid.svg'
import likeActiveIcon from '../assets/icons/like-active.svg'
import likeIcon from '../assets/icons/like.svg'
import settingsIcon from '../assets/icons/settings.svg'
import {
  AppHeader,
  HomeBottomNav,
  UnsavedChangesModal,
} from '../sharedComponents'
import {
  AuthRequiredError,
  FeedAccessDeniedError,
  completeTask,
  createComment,
  createTask,
  fetchFeed,
  likePost,
  startTask,
  unlikePost,
} from '../feedApi'
import { fetchMyPage } from '../mypageApi'

const feedIntroStorageKey = 'onestep-feed-intro-seen'
const activeHomeViewStorageKey = 'onestep-active-home-view'

function getInitialHomeView() {
  return window.sessionStorage.getItem(activeHomeViewStorageKey)
}

export function HomePage() {
  const settingsCameraInputRef = useRef<HTMLInputElement>(null)
  const settingsPhotoInputRef = useRef<HTMLInputElement>(null)
  const [taskText, setTaskText] = useState('')
  const [taskError, setTaskError] = useState('')
  const [activeTask, setActiveTask] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTaskComplete, setIsTaskComplete] = useState(false)
  const [completedTaskReactions, setCompletedTaskReactions] = useState({
    likes: 0,
    comments: [] as FeedComment[],
  })
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [initialHomeView] = useState(getInitialHomeView)
  const [isFeedOpen, setIsFeedOpen] = useState(initialHomeView === 'feed')
  const [isProfileOpen, setIsProfileOpen] = useState(
    initialHomeView === 'profile',
  )
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const [activeAchievementId, setActiveAchievementId] = useState<string | null>(
    null,
  )
  const [activeAchievementTab, setActiveAchievementTab] =
    useState<AchievementDetailTab>('likes')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isAccountDeleteConfirmOpen, setIsAccountDeleteConfirmOpen] =
    useState(false)
  const [isAccountDeletedOpen, setIsAccountDeletedOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [accountDeleteError, setAccountDeleteError] = useState('')
  const [isNameEditOpen, setIsNameEditOpen] = useState(false)
  const [isIconEditOpen, setIsIconEditOpen] = useState(false)
  const [isNameDiscardConfirmOpen, setIsNameDiscardConfirmOpen] =
    useState(false)
  const [isIconDiscardConfirmOpen, setIsIconDiscardConfirmOpen] =
    useState(false)
  const [completeProfile, setCompleteProfile] = useState(() =>
    getInitialCompleteProfile(),
  )
  const [displayNameDraft, setDisplayNameDraft] = useState(
    completeProfile.name || 'おこめ',
  )
  const [selectedSettingsIconId, setSelectedSettingsIconId] = useState(
    completeProfile.avatarId,
  )
  const [settingsCustomPhotoUrl, setSettingsCustomPhotoUrl] = useState(
    isAvatarImageDataUrl(completeProfile.avatarId)
      ? completeProfile.avatarId
      : '',
  )
  const [isSettingsAvatarGridOpen, setIsSettingsAvatarGridOpen] =
    useState(false)
  const [isSettingsCameraAvailable, setIsSettingsCameraAvailable] =
    useState(false)
  const [feedRemainingSeconds, setFeedRemainingSeconds] = useState(
    0,
  )
  const [feedAccessExpiresAt, setFeedAccessExpiresAt] = useState<number | null>(
    null,
  )
  const [feedNow, setFeedNow] = useState(() => Date.now())
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [isFeedAccessDenied, setIsFeedAccessDenied] = useState(false)
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [isFeedTimeoutModalOpen, setIsFeedTimeoutModalOpen] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [isFeedIntroOpen, setIsFeedIntroOpen] = useState(false)
  const [myPageData, setMyPageData] = useState<MyPageData | null>(null)
  const [isMyPageLoading, setIsMyPageLoading] = useState(false)
  const [myPageError, setMyPageError] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  )
  const isTaskActive = Boolean(activeTask)
  const isTaskRunning = isTaskActive && !isTaskComplete
  const hasCompleteComments = completedTaskReactions.comments.length > 0
  const isFeedExpired = isFeedOpen && isFeedTimeoutModalOpen
  const visibleFeedPosts = feedPosts
  const profileAvatarSrc = getCompleteAvatarSrc(completeProfile)
  const profileName = completeProfile.name || 'おこめ'
  const trimmedDisplayNameDraft = displayNameDraft.trim()
  const hasDisplayNameDraftChanged = displayNameDraft !== profileName
  const canSaveDisplayName =
    trimmedDisplayNameDraft.length > 0 && trimmedDisplayNameDraft !== profileName
  const settingsIconPreviewSrc = getAvatarSrc(selectedSettingsIconId)
  const canSaveSettingsIcon = selectedSettingsIconId !== completeProfile.avatarId
  const level = myPageData?.level ?? 0
  const nextLevel = myPageData?.nextLevel ?? 1
  const remainingToNextLevel = myPageData?.remainingToNextLevel ?? 10
  const progressPercent = myPageData?.progressPercent ?? 0
  const achievementsCount = myPageData?.achievementsCount ?? 0
  const hasProfileAchievements = achievementsCount > 0
  const allProfileAchievements = myPageData?.allAchievements ?? []
  const recentAchievements = myPageData?.recentAchievements ?? []
  const activeAchievement = activeAchievementId
    ? (allProfileAchievements.find(
        (achievement) => achievement.id === activeAchievementId,
      ) ??
        recentAchievements.find(
          (achievement) => achievement.id === activeAchievementId,
        ) ??
        null)
    : null
  const activeCommentPost = activeCommentPostId
    ? (feedPosts.find((post) => post.id === activeCommentPostId) ?? null)
    : null

  function upsertOwnTaskPost(
    task: {
      title: string
      completion_post_id?: number
      completion_post?: {
        id: number
        status_label: string
        card_variant: 'doing' | 'completed'
        likes_count?: number
        comments_count?: number
        liked_by_me?: boolean
        comments?: Array<{
          id: number
          body: string
          user_name?: string
          avatar_key?: string
          post_status_when_commented: 'doing' | 'completed'
          created_at: string
        }>
        created_at: string
      } | null
    },
  ) {
    const completionPost = task.completion_post
    const postId = completionPost?.id ?? task.completion_post_id

    if (!postId) {
      return
    }

    const nextPost: FeedPost = {
      id: String(postId),
      userName: 'あなた',
      level: 1,
      task: task.title,
      status: completionPost?.card_variant === 'completed' ? 'done' : 'doing',
      statusLabel:
        completionPost?.status_label ??
        (completionPost?.card_variant === 'completed' ? 'できた' : 'やります'),
      likes: completionPost?.likes_count ?? 0,
      comments:
        completionPost?.comments?.map((comment) => ({
          id: String(comment.id),
          body: comment.body,
          userName: comment.user_name ?? 'みき',
          avatarId: comment.avatar_key ?? 'avatar-1',
          level: 1,
          postStatusWhenCommented:
            comment.post_status_when_commented === 'completed'
              ? 'done'
              : 'doing',
          createdAt: new Date(comment.created_at).getTime(),
        })) ?? [],
      createdAt: completionPost?.created_at
        ? new Date(completionPost.created_at).getTime()
        : Date.now(),
      liked: completionPost?.liked_by_me ?? false,
      commented: false,
      isOwnPost: true,
      canLike: true,
      canComment: true,
    }

    setFeedPosts((currentPosts) => {
      const existingPost = currentPosts.find((post) => post.id === nextPost.id)

      if (!existingPost) {
        return [nextPost, ...currentPosts]
      }

      return currentPosts.map((post) =>
        post.id === nextPost.id
          ? {
              ...post,
              task: nextPost.task,
              status: nextPost.status,
              statusLabel: nextPost.statusLabel,
              likes: completionPost?.likes_count ?? post.likes,
              comments: completionPost?.comments ? nextPost.comments : post.comments,
              liked: completionPost?.liked_by_me ?? post.liked,
              commented: post.commented,
            }
          : post,
      )
    })
  }

  useEffect(() => {
    if (!isTaskRunning) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isTaskRunning])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const updateCameraAvailability = () => {
      setIsSettingsCameraAvailable(mediaQuery.matches)
    }

    updateCameraAvailability()
    mediaQuery.addEventListener('change', updateCameraAvailability)

    return () =>
      mediaQuery.removeEventListener('change', updateCameraAvailability)
  }, [])

  useEffect(() => {
    if (!isTaskComplete) {
      return
    }

    window.scrollTo({ top: 0, left: 0 })
  }, [isTaskComplete])

  useEffect(() => {
    if (
      !isFeedOpen ||
      isFeedAccessDenied ||
      isFeedLoading ||
      isFeedExpired
    ) {
      return undefined
    }

    if (feedRemainingSeconds <= 0) {
      return undefined
    }

    const expirationTimerId = window.setTimeout(() => {
      setFeedRemainingSeconds(0)
      setFeedAccessExpiresAt(null)
      setIsFeedTimeoutModalOpen(true)
      setFeedNow(Date.now())
    }, feedRemainingSeconds * 1000)
    const timerId = window.setInterval(() => {
      setFeedRemainingSeconds((current) => {
        const nextSeconds = Math.max(0, current - 1)

        if (nextSeconds === 0) {
          setFeedAccessExpiresAt(null)
          setIsFeedTimeoutModalOpen(true)
        }

        return nextSeconds
      })
      setFeedNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
      window.clearTimeout(expirationTimerId)
    }
  }, [
    feedRemainingSeconds,
    isFeedAccessDenied,
    isFeedExpired,
    isFeedLoading,
    isFeedOpen,
  ])

  const loadFeed = useCallback(async () => {
    setFeedError('')
    setIsFeedLoading(true)
    setIsFeedTimeoutModalOpen(false)

    try {
      const result = await fetchFeed(completeProfile.id)
      const nextRemainingSeconds =
        result.remainingSeconds ?? feedViewDurationSeconds
      setFeedPosts(result.posts)
      setFeedRemainingSeconds(nextRemainingSeconds)
      setFeedAccessExpiresAt(
        result.feedAccessExpiresAt
          ? new Date(result.feedAccessExpiresAt).getTime()
          : Date.now() + nextRemainingSeconds * 1000,
      )
      setIsFeedAccessDenied(false)
      setFeedNow(Date.now())

      if (!window.localStorage.getItem(feedIntroStorageKey)) {
        setIsFeedIntroOpen(true)
      }
    } catch (caughtError) {
      if (caughtError instanceof FeedAccessDeniedError) {
        setFeedPosts([])
        setFeedRemainingSeconds(0)
        setFeedAccessExpiresAt(null)
        setIsFeedAccessDenied(true)
        setIsFeedTimeoutModalOpen(false)
        setIsFeedIntroOpen(false)
        return
      }

      setIsFeedAccessDenied(false)
      setFeedError(
        caughtError instanceof Error
          ? caughtError.message
          : 'フィード取得に失敗しました。',
      )
    } finally {
      setIsFeedLoading(false)
    }
  }, [completeProfile.id])

  const loadMyPage = useCallback(async () => {
    setMyPageError('')
    setIsMyPageLoading(true)

    try {
      const result = await fetchMyPage(completeProfile.id)
      setMyPageData(result)
      setFeedNow(Date.now())
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      setMyPageError(
        caughtError instanceof Error
          ? caughtError.message
          : 'マイページ取得に失敗しました。',
      )
    } finally {
      setIsMyPageLoading(false)
    }
  }, [completeProfile.id])

  useEffect(() => {
    if (!isFeedOpen) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      void loadFeed()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [isFeedOpen, loadFeed])

  useEffect(() => {
    if (!isProfileOpen && !isAchievementsOpen) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      void loadMyPage()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [isAchievementsOpen, isProfileOpen, loadMyPage])

  function closeFeedIntro() {
    window.localStorage.setItem(feedIntroStorageKey, 'true')
    setIsFeedIntroOpen(false)
  }

  function openFeed(event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
    event?.preventDefault()
    window.sessionStorage.setItem(activeHomeViewStorageKey, 'feed')
    setIsFeedOpen(true)
    setIsProfileOpen(false)
    setIsAchievementsOpen(false)
    setActiveAchievementId(null)
    setIsSettingsOpen(false)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    const hasKnownFeedAccess =
      feedAccessExpiresAt !== null && feedAccessExpiresAt > Date.now()
    if (!hasKnownFeedAccess) {
      setFeedPosts([])
      setFeedRemainingSeconds(0)
    }
    setFeedError('')
    setIsFeedAccessDenied(!hasKnownFeedAccess)
    setIsFeedTimeoutModalOpen(false)
    if (isFeedOpen) {
      void loadFeed()
    }
    window.scrollTo({ top: 0, left: 0 })
  }

  function openHome(event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
    event?.preventDefault()
    window.sessionStorage.setItem(activeHomeViewStorageKey, 'home')
    setIsFeedOpen(false)
    setIsProfileOpen(false)
    setIsAchievementsOpen(false)
    setActiveAchievementId(null)
    setIsSettingsOpen(false)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    setIsFeedAccessDenied(false)
    setIsFeedTimeoutModalOpen(false)
    setFeedError('')
    window.scrollTo({ top: 0, left: 0 })
  }

  function startNextTaskFromExpiredFeed(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    window.sessionStorage.setItem(activeHomeViewStorageKey, 'home')
    setIsFeedOpen(false)
    setIsProfileOpen(false)
    setIsAchievementsOpen(false)
    setActiveAchievementId(null)
    setIsSettingsOpen(false)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    setIsFeedAccessDenied(false)
    setIsFeedTimeoutModalOpen(false)
    handleNextTask()
    window.scrollTo({ top: 0, left: 0 })
  }

  function openProfile(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault()
    window.sessionStorage.setItem(activeHomeViewStorageKey, 'profile')
    setIsFeedOpen(false)
    setIsProfileOpen(true)
    setIsAchievementsOpen(false)
    setActiveAchievementId(null)
    setIsSettingsOpen(false)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    if (isProfileOpen) {
      void loadMyPage()
    }
    window.scrollTo({ top: 0, left: 0 })
  }

  function openAchievements(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    window.sessionStorage.setItem(activeHomeViewStorageKey, 'profile')
    void loadMyPage()
    setIsAchievementsOpen(true)
    setActiveAchievementId(null)
    setIsProfileOpen(false)
    setIsFeedOpen(false)
    setIsSettingsOpen(false)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function closeAchievements() {
    setIsAchievementsOpen(false)
    setIsProfileOpen(true)
    setActiveAchievementId(null)
    window.scrollTo({ top: 0, left: 0 })
  }

  function openAchievementDetail(
    achievementId: string,
    tab: AchievementDetailTab,
  ) {
    setActiveAchievementId(achievementId)
    setActiveAchievementTab(tab)
  }

  function closeAchievementDetail() {
    setActiveAchievementId(null)
  }

  function openSettings() {
    setIsSettingsOpen(true)
    setIsAchievementsOpen(false)
    setActiveAchievementId(null)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    setIsFeedOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function closeSettings() {
    setIsSettingsOpen(false)
    setIsLogoutConfirmOpen(false)
    setIsAccountDeleteConfirmOpen(false)
    setIsAccountDeletedOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    setIsProfileOpen(true)
    window.scrollTo({ top: 0, left: 0 })
  }

  function openLogoutConfirm() {
    setIsLogoutConfirmOpen(true)
    setIsAccountDeleteConfirmOpen(false)
  }

  function closeLogoutConfirm() {
    setIsLogoutConfirmOpen(false)
  }

  function confirmLogout() {
    clearAuthSession()
    window.sessionStorage.removeItem(activeHomeViewStorageKey)
    window.location.href = '/login'
  }

  function redirectToLoginForAuthRequired() {
    clearAuthSession()
    window.localStorage.removeItem(signupCompleteStorageKey)
    window.sessionStorage.removeItem(activeHomeViewStorageKey)
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.sessionStorage.removeItem(signupDraftStorageKey)
    window.location.assign('/login')
  }

  function openAccountDeleteConfirm() {
    setIsAccountDeleteConfirmOpen(true)
    setIsLogoutConfirmOpen(false)
    setAccountDeleteError('')
  }

  function closeAccountDeleteConfirm() {
    if (isDeletingAccount) {
      return
    }

    setIsAccountDeleteConfirmOpen(false)
    setAccountDeleteError('')
  }

  async function confirmAccountDelete() {
    if (isDeletingAccount) {
      return
    }

    const hasAccountIdentifier = Boolean(
      completeProfile.id ||
        completeProfile.email ||
        (completeProfile.name && completeProfile.avatarId),
    )

    if (!hasAccountIdentifier) {
      setAccountDeleteError('アカウント情報を確認できませんでした。')
      return
    }

    setIsDeletingAccount(true)
    setAccountDeleteError('')

    try {
      await deleteAccount({
        id: completeProfile.id,
        email: completeProfile.email,
        name: completeProfile.name,
        avatarKey: completeProfile.avatarId,
      })
      clearAuthSession()
      window.localStorage.removeItem(signupCompleteStorageKey)
      window.sessionStorage.removeItem(activeHomeViewStorageKey)
      window.sessionStorage.removeItem(signupScreenStorageKey)
      window.sessionStorage.removeItem(signupDraftStorageKey)
      setIsAccountDeleteConfirmOpen(false)
      setIsAccountDeletedOpen(true)
    } catch (caughtError) {
      setAccountDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : 'アカウント削除に失敗しました。',
      )
    } finally {
      setIsDeletingAccount(false)
    }
  }

  function goToLoginAfterAccountDelete() {
    window.location.href = '/login'
  }

  function openNameEdit() {
    setDisplayNameDraft(profileName)
    setIsNameEditOpen(true)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function closeNameEdit() {
    if (hasDisplayNameDraftChanged) {
      setIsNameDiscardConfirmOpen(true)
      return
    }

    setDisplayNameDraft(profileName)
    setIsNameEditOpen(false)
    setIsSettingsOpen(true)
    setIsNameDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function openIconEdit() {
    const nextAvatarId = completeProfile.avatarId

    setSelectedSettingsIconId(nextAvatarId)
    setSettingsCustomPhotoUrl(
      isAvatarImageDataUrl(nextAvatarId) ? nextAvatarId : '',
    )
    setIsSettingsAvatarGridOpen(false)
    setIsIconEditOpen(true)
    setIsNameEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function closeIconEdit() {
    if (canSaveSettingsIcon) {
      setIsIconDiscardConfirmOpen(true)
      setIsSettingsAvatarGridOpen(false)
      return
    }

    setIsIconEditOpen(false)
    setIsSettingsOpen(true)
    setIsSettingsAvatarGridOpen(false)
    setIsIconDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  const saveSettingsIcon = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    if (!canSaveSettingsIcon) {
      return
    }

    const nextProfile = {
      ...completeProfile,
      avatarId: selectedSettingsIconId,
    }

    setCompleteProfile(nextProfile)
    saveCompleteProfile(nextProfile)
    setIsIconEditOpen(false)
    setIsSettingsOpen(true)
    setIsSettingsAvatarGridOpen(false)
    setIsIconDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }, [canSaveSettingsIcon, completeProfile, selectedSettingsIconId])

  useEffect(() => {
    if (!isSettingsOpen || !isIconEditOpen) {
      return
    }

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      const target =
        event.target instanceof HTMLElement ? event.target : document.body

      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        Boolean(target.closest('button, input, select, textarea, a')) ||
        isSettingsAvatarGridOpen ||
        !canSaveSettingsIcon
      ) {
        return
      }

      event.preventDefault()
      saveSettingsIcon()
    }

    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [
    canSaveSettingsIcon,
    isIconEditOpen,
    isSettingsAvatarGridOpen,
    isSettingsOpen,
    saveSettingsIcon,
  ])

  function handleSettingsAvatarClick(avatarId: string) {
    if (avatarId !== customPhotoIconId || settingsCustomPhotoUrl) {
      setSelectedSettingsIconId(avatarId)
    }
  }

  async function handleSettingsPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    try {
      const photoDataUrl = await createAvatarImageDataUrl(selectedFile)

      setSettingsCustomPhotoUrl(photoDataUrl)
      setSelectedSettingsIconId(photoDataUrl)
      setIsSettingsAvatarGridOpen(false)
    } catch {
      // Keep the current icon when image loading fails.
    } finally {
      event.target.value = ''
    }
  }

  function continueNameEdit() {
    setIsNameDiscardConfirmOpen(false)
  }

  function continueIconEdit() {
    setIsIconDiscardConfirmOpen(false)
  }

  function discardNameEdit() {
    setDisplayNameDraft(profileName)
    setIsNameDiscardConfirmOpen(false)
    setIsNameEditOpen(false)
    setIsSettingsOpen(true)
    window.scrollTo({ top: 0, left: 0 })
  }

  function discardIconEdit() {
    const currentAvatarId = completeProfile.avatarId

    setSelectedSettingsIconId(currentAvatarId)
    setSettingsCustomPhotoUrl(
      isAvatarImageDataUrl(currentAvatarId) ? currentAvatarId : '',
    )
    setIsIconDiscardConfirmOpen(false)
    setIsIconEditOpen(false)
    setIsSettingsOpen(true)
    setIsSettingsAvatarGridOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSaveDisplayName) {
      return
    }

    const nextProfile = {
      ...completeProfile,
      name: trimmedDisplayNameDraft,
    }

    setCompleteProfile(nextProfile)
    saveCompleteProfile(nextProfile)
    setIsNameEditOpen(false)
    setIsSettingsOpen(true)
    setIsNameDiscardConfirmOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  async function handleTaskStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isTaskSubmitting) {
      return
    }

    const nextTask = taskText.trim()

    if (!nextTask) {
      setTaskError('やることを入力してください')
      return
    }

    if (!completeProfile.id) {
      redirectToLoginForAuthRequired()
      return
    }

    setTaskError('')
    setIsTaskSubmitting(true)

    try {
      const task = await createTask(nextTask, completeProfile.id)
      const startedTask = await startTask(task.id, completeProfile.id)
      setActiveTaskId(startedTask.id)
      setActiveTask(startedTask.title)
      setElapsedSeconds(0)
      setIsTaskComplete(false)
      setCompletedTaskReactions({ likes: 0, comments: [] })
      upsertOwnTaskPost(startedTask)
      await loadFeed()
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      setTaskError(
        caughtError instanceof Error
          ? caughtError.message
          : 'タスク開始に失敗しました。',
      )
    } finally {
      setIsTaskSubmitting(false)
    }
  }

  function handleTaskCancel() {
    setIsCancelConfirmOpen(true)
  }

  function closeTaskCancelConfirm() {
    setIsCancelConfirmOpen(false)
  }

  function confirmTaskCancel() {
    setActiveTask('')
    setActiveTaskId(null)
    setElapsedSeconds(0)
    setIsTaskComplete(false)
    setCompletedTaskReactions({ likes: 0, comments: [] })
    setIsCancelConfirmOpen(false)
    setIsFeedOpen(false)
    setIsProfileOpen(false)
    setIsSettingsOpen(false)
    setIsNameEditOpen(false)
    setIsIconEditOpen(false)
    setIsNameDiscardConfirmOpen(false)
    setIsIconDiscardConfirmOpen(false)
    window.history.pushState(null, '', '/home')
    window.scrollTo({ top: 0, left: 0 })
  }

  async function handleTaskDone() {
    if (!activeTaskId || isTaskSubmitting) {
      return
    }

    if (!completeProfile.id) {
      redirectToLoginForAuthRequired()
      return
    }

    setIsTaskSubmitting(true)

    try {
      const completedTask = await completeTask(activeTaskId, completeProfile.id)
      upsertOwnTaskPost(completedTask)
      setCompletedTaskReactions({
        likes: completedTask.completion_post?.likes_count ?? 0,
        comments:
          completedTask.completion_post?.comments?.map((comment) => ({
            id: String(comment.id),
            body: comment.body,
            userName: comment.user_name ?? 'みき',
            avatarId: comment.avatar_key ?? 'avatar-1',
            level: comment.level ?? 1,
            postStatusWhenCommented:
              comment.post_status_when_commented === 'completed'
                ? 'done'
                : 'doing',
            createdAt: new Date(comment.created_at).getTime(),
          })) ?? [],
      })
      setIsTaskComplete(true)
      await loadFeed()
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      setTaskError(
        caughtError instanceof Error
          ? caughtError.message
          : 'タスク完了に失敗しました。',
      )
    } finally {
      setIsTaskSubmitting(false)
    }
  }

  function handleNextTask() {
    setTaskText('')
    setTaskError('')
    setActiveTask('')
    setActiveTaskId(null)
    setElapsedSeconds(0)
    setIsTaskComplete(false)
    setCompletedTaskReactions({ likes: 0, comments: [] })
  }

  async function togglePostLike(postId: string) {
    const targetPost = feedPosts.find((post) => post.id === postId)

    if (!targetPost?.canLike) {
      return
    }

    setFeedPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post
        }

        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? Math.max(0, post.likes - 1) : post.likes + 1,
        }
      }),
    )

    try {
      if (targetPost.liked) {
        await unlikePost(postId, completeProfile.id)
      } else {
        await likePost(postId, completeProfile.id)
      }
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      await loadFeed()
    }
  }

  function handleCommentDraftChange(postId: string, value: string) {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: value,
    }))
  }

  function openCommentPanel(postId: string) {
    setActiveCommentPostId(postId)
  }

  function closeCommentPanel() {
    setActiveCommentPostId(null)
  }

  async function addPostComment(postId: string) {
    const targetPost = feedPosts.find((post) => post.id === postId)

    if (!targetPost?.canComment) {
      return
    }

    const nextComment = (commentDrafts[postId] ?? '').trim()

    if (!nextComment) {
      return
    }

    try {
      const createdComment = await createComment(
        postId,
        nextComment,
        completeProfile.id,
      )

      setFeedPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                commented: true,
                comments: [...post.comments, createdComment],
              }
            : post,
        ),
      )
      setCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [postId]: '',
      }))
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      await loadFeed()
    }
  }

  if (isSettingsOpen && isNameEditOpen) {
    return (
      <main className="home-page name-edit-page">
        <AppHeader
          title="名前"
          leftAction={
            <button
              className="settings-back-button"
              type="button"
              aria-label="設定に戻る"
              onClick={closeNameEdit}
            >
              &lt;
            </button>
          }
          rightAction={
            <button
              className="name-edit-done-button"
              type="submit"
              form="display-name-form"
              disabled={!canSaveDisplayName}
            >
              完了
            </button>
          }
        />

        <section className="name-edit-content" aria-label="表示名変更">
          <form
            id="display-name-form"
            className="name-edit-form"
            onSubmit={saveDisplayName}
          >
            <label htmlFor="display-name-input">表示名</label>
            <input
              id="display-name-input"
              type="text"
              value={displayNameDraft}
              onChange={(event) => setDisplayNameDraft(event.target.value)}
            />
          </form>
        </section>

        {isNameDiscardConfirmOpen ? (
          <UnsavedChangesModal
            onContinue={continueNameEdit}
            onDiscard={discardNameEdit}
          />
        ) : null}
      </main>
    )
  }

  if (isSettingsOpen && isIconEditOpen) {
    return (
      <main className="home-page icon-edit-page">
        <AppHeader
          title="アイコン"
          leftAction={
            <button
              className="settings-back-button"
              type="button"
              aria-label="設定に戻る"
              onClick={closeIconEdit}
            >
              &lt;
            </button>
          }
          rightAction={
            <button
              className="name-edit-done-button"
              type="submit"
              form="settings-icon-form"
              disabled={!canSaveSettingsIcon}
            >
              完了
            </button>
          }
        />

        <form
          id="settings-icon-form"
          className="icon-edit-content"
          aria-label="アイコン変更"
          onSubmit={saveSettingsIcon}
        >
          <img
            className="icon-edit-preview"
            src={settingsIconPreviewSrc}
            alt=""
            aria-hidden="true"
          />

          <div className="icon-edit-action-list">
            <button
              className="icon-edit-action"
              type="button"
              aria-expanded={isSettingsAvatarGridOpen}
              onClick={() =>
                setIsSettingsAvatarGridOpen((current) => !current)
              }
            >
              <img
                className="icon-edit-action-icon icon-edit-action-icon-grid"
                src={iconGridIcon}
                alt=""
                aria-hidden="true"
              />
              <span className="icon-edit-action-text-grid">
                アイコンを選択
              </span>
            </button>

            {isSettingsCameraAvailable ? (
              <button
                className="icon-edit-action icon-edit-camera-action"
                type="button"
                onClick={() => settingsCameraInputRef.current?.click()}
              >
                <img
                  className="icon-edit-action-icon icon-edit-action-icon-camera"
                  src={cameraIcon}
                  alt=""
                  aria-hidden="true"
                />
                <span>カメラで撮影</span>
              </button>
            ) : null}

            <button
              className="icon-edit-action"
              type="button"
              onClick={() => settingsPhotoInputRef.current?.click()}
            >
              <span
                className="icon-edit-action-icon icon-edit-action-icon-folder folder-icon"
                aria-hidden="true"
              />
              <span>写真を選ぶ</span>
            </button>
          </div>

          {isSettingsAvatarGridOpen ? (
            <div
              className="icon-palette-backdrop"
              role="presentation"
              onClick={() => setIsSettingsAvatarGridOpen(false)}
            >
              <section
                className="icon-palette-modal"
                role="dialog"
                aria-modal="true"
                aria-label="アイコンを選択"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="icon-palette-close-button"
                  type="button"
                  aria-label="閉じる"
                  onClick={() => setIsSettingsAvatarGridOpen(false)}
                >
                  ×
                </button>
                <div
                  className="avatar-grid icon-edit-avatar-grid"
                  role="radiogroup"
                  aria-label="アイコン"
                >
                  {avatarOptions.map((avatar) => {
                    const isCustomPhoto = avatar.id === customPhotoIconId
                    const hasCustomPhoto = isCustomPhoto && settingsCustomPhotoUrl
                    const isCameraSlot = isCustomPhoto && !hasCustomPhoto
                    const avatarId = hasCustomPhoto
                      ? settingsCustomPhotoUrl
                      : avatar.id

                    return (
                      <button
                        key={avatar.id}
                        className={`avatar-option ${
                          selectedSettingsIconId === avatarId ? 'selected' : ''
                        } ${isCameraSlot ? 'photo-slot-empty' : ''}`}
                        type="button"
                        role="radio"
                        aria-checked={selectedSettingsIconId === avatarId}
                        aria-label={isCameraSlot ? '写真未選択' : avatar.label}
                        disabled={isCameraSlot}
                        onClick={() => handleSettingsAvatarClick(avatarId)}
                      >
                        {hasCustomPhoto ? (
                          <img
                            src={settingsCustomPhotoUrl}
                            alt=""
                            aria-hidden="true"
                          />
                        ) : (
                          !isCustomPhoto && (
                            <img src={avatar.src} alt="" aria-hidden="true" />
                          )
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>
          ) : null}

          <input
            ref={settingsCameraInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            capture="user"
            aria-label="撮影する写真"
            onChange={handleSettingsPhotoChange}
          />
          <input
            ref={settingsPhotoInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            aria-label="選択する写真"
            onChange={handleSettingsPhotoChange}
          />
        </form>

        {isIconDiscardConfirmOpen ? (
          <UnsavedChangesModal
            onContinue={continueIconEdit}
            onDiscard={discardIconEdit}
          />
        ) : null}
      </main>
    )
  }

  if (isSettingsOpen) {
    return (
      <main className="home-page settings-page">
        <AppHeader
          title="設定"
          leftAction={
            <button
              className="settings-back-button"
              type="button"
              aria-label="マイページに戻る"
              onClick={closeSettings}
            >
              &lt;
            </button>
          }
        />

        <section className="settings-content" aria-label="設定">
          <div className="settings-menu-group">
            <button
              className="settings-menu-item"
              type="button"
              onClick={openNameEdit}
            >
              <span className="settings-menu-label">
                <span
                  className="settings-menu-icon settings-menu-icon-name"
                  aria-hidden="true"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7.5H15.5"
                      stroke="#9B6BFF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5 14H12.5"
                      stroke="#9B6BFF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5 20.5H10"
                      stroke="#9B6BFF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18.2 9.3L21.7 12.8"
                      stroke="#9B6BFF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12.8 21.2L16.1 20.4L23.4 13.1C24.2 12.3 24.2 11 23.4 10.2L22.8 9.6C22 8.8 20.7 8.8 19.9 9.6L12.6 16.9L11.8 20.2C11.6 20.8 12.2 21.4 12.8 21.2Z"
                      stroke="#9B6BFF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>表示名変更</span>
              </span>
              <span className="settings-menu-chevron" aria-hidden="true">
                &gt;
              </span>
            </button>
            <button
              className="settings-menu-item"
              type="button"
              onClick={openIconEdit}
            >
              <span className="settings-menu-label">
                <span
                  className="settings-menu-icon settings-menu-icon-avatar"
                  aria-hidden="true"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="14"
                      cy="10"
                      r="4"
                      stroke="#2EA8FF"
                      strokeWidth="2.3"
                    />
                    <path
                      d="M6.5 22C7.6 18.4 10.3 16.5 14 16.5C17.7 16.5 20.4 18.4 21.5 22"
                      stroke="#2EA8FF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M20.5 7.5L22.5 5.5"
                      stroke="#2EA8FF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M22.5 5.5L24.5 7.5"
                      stroke="#2EA8FF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M22.5 5.5V11"
                      stroke="#2EA8FF"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span>アイコン変更</span>
              </span>
              <span className="settings-menu-chevron" aria-hidden="true">
                &gt;
              </span>
            </button>
          </div>

          <div className="settings-menu-group">
            <button
              className="settings-menu-item"
              type="button"
              onClick={openLogoutConfirm}
            >
              <span className="settings-menu-label">
                <span
                  className="settings-menu-icon settings-menu-icon-logout"
                  aria-hidden="true"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17 6H10C8.9 6 8 6.9 8 8V20C8 21.1 8.9 22 10 22H17"
                      stroke="#24C58A"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 14H23"
                      stroke="#24C58A"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M20 11L23 14L20 17"
                      stroke="#24C58A"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>ログアウト</span>
              </span>
              <span className="settings-menu-chevron" aria-hidden="true">
                &gt;
              </span>
            </button>
            <button
              className="settings-menu-item settings-menu-item-danger"
              type="button"
              onClick={openAccountDeleteConfirm}
            >
              <span className="settings-menu-label">
                <span
                  className="settings-menu-icon settings-menu-icon-delete"
                  aria-hidden="true"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="11"
                      y="4.5"
                      width="6"
                      height="3"
                      rx="1"
                      stroke="#FF5A5F"
                      strokeWidth="2.3"
                    />
                    <path
                      d="M7 8H21"
                      stroke="#FF5A5F"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <rect
                      x="8"
                      y="8"
                      width="12"
                      height="14"
                      rx="2.5"
                      stroke="#FF5A5F"
                      strokeWidth="2.3"
                    />
                    <path
                      d="M12 12V18"
                      stroke="#FF5A5F"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 12V18"
                      stroke="#FF5A5F"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span>アカウント削除</span>
              </span>
              <span className="settings-menu-chevron" aria-hidden="true">
                &gt;
              </span>
            </button>
          </div>
        </section>

        {isLogoutConfirmOpen ? (
          <div className="logout-modal-backdrop" role="presentation">
            <section
              className="logout-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-modal-title"
              aria-describedby="logout-modal-description"
            >
              <div className="logout-modal-body">
                <h2 id="logout-modal-title">ログアウトしますか？</h2>
                <p id="logout-modal-description">
                  現在のアカウントからログアウトします。
                </p>
              </div>
              <div className="logout-modal-actions">
                <button
                  className="logout-modal-secondary"
                  type="button"
                  onClick={closeLogoutConfirm}
                >
                  キャンセル
                </button>
                <button
                  className="logout-modal-primary"
                  type="button"
                  onClick={confirmLogout}
                >
                  ログアウト
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {isAccountDeleteConfirmOpen ? (
          <div className="logout-modal-backdrop" role="presentation">
            <section
              className="logout-modal account-delete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-delete-modal-title"
              aria-describedby="account-delete-modal-description"
            >
              <div className="logout-modal-body">
                <h2 id="account-delete-modal-title">
                  アカウントを削除しますか？
                </h2>
                <p id="account-delete-modal-description">
                  この操作は取り消せません。
                  <br />
                  アカウントとすべてのデータが削除されます。
                </p>
                {accountDeleteError ? (
                  <p className="account-delete-error" role="alert">
                    {accountDeleteError}
                  </p>
                ) : null}
              </div>
              <div className="logout-modal-actions">
                <button
                  className="logout-modal-secondary"
                  type="button"
                  onClick={closeAccountDeleteConfirm}
                  disabled={isDeletingAccount}
                >
                  キャンセル
                </button>
                <button
                  className="account-delete-modal-primary"
                  type="button"
                  onClick={confirmAccountDelete}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? '削除中' : '削除する'}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {isAccountDeletedOpen ? (
          <div className="account-deleted-page" role="presentation">
            <section
              className="account-deleted-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-deleted-modal-title"
              aria-describedby="account-deleted-modal-description"
            >
              <h2 id="account-deleted-modal-title">
                アカウントを削除しました
              </h2>
              <p id="account-deleted-modal-description">
                ご利用ありがとうございました。
              </p>
              <div className="account-deleted-divider" aria-hidden="true" />
              <button
                className="account-deleted-button"
                type="button"
                onClick={goToLoginAfterAccountDelete}
              >
                ログイン画面へ
              </button>
            </section>
          </div>
        ) : null}
      </main>
    )
  }

  if (isAchievementsOpen) {
    return (
      <main
        className={`home-page profile-page achievements-page ${
          activeAchievement ? 'detail-open' : ''
        }`}
      >
        <AppHeader
          title="すべての達成"
          leftAction={
            <button
              className="settings-back-button"
              type="button"
              aria-label="マイページに戻る"
              onClick={closeAchievements}
            >
              &lt;
            </button>
          }
        />

        <section
          className="all-achievements-content"
          aria-label="すべての達成"
        >
          {myPageError ? (
            <p className="profile-state-message" role="alert">
              {myPageError}
            </p>
          ) : isMyPageLoading && !myPageData ? (
            <p className="profile-state-message">読み込み中...</p>
          ) : allProfileAchievements.length === 0 ? (
            <p className="profile-state-message">まだ記録はありません</p>
          ) : (
            <div className="profile-achievement-list all-achievement-list">
              {allProfileAchievements.map((achievement) => (
                <article
                  className={`profile-achievement-card all-achievement-card ${
                    activeAchievementId === achievement.id ? 'is-active' : ''
                  }`}
                  key={achievement.id}
                >
                  <strong>{achievement.task}</strong>
                  <div>
                    <button
                      className="achievement-reaction-button"
                      type="button"
                      onClick={() =>
                        openAchievementDetail(achievement.id, 'likes')
                      }
                    >
                      <img src={likeIcon} alt="" aria-hidden="true" />
                      {achievement.likes}
                    </button>
                    <button
                      className="achievement-reaction-button"
                      type="button"
                      onClick={() =>
                        openAchievementDetail(achievement.id, 'comments')
                      }
                    >
                      <img src={commentIcon} alt="" aria-hidden="true" />
                      {achievement.comments}
                    </button>
                    <time
                      dateTime={new Date(achievement.createdAt).toISOString()}
                    >
                      {formatFeedPostAge(achievement.createdAt, feedNow)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {activeAchievement ? (
          <>
            <button
              className="feed-comment-backdrop achievement-detail-backdrop"
              type="button"
              aria-label="詳細を閉じる"
              onClick={closeAchievementDetail}
            />
            <section
              className="feed-comment-panel feed-comment-panel-done achievement-detail-panel"
              aria-labelledby="achievement-detail-title"
            >
              <div className="feed-comment-panel-header">
                <h2 id="achievement-detail-title">
                  {activeAchievementTab === 'likes' ? 'いいね' : 'コメント'}
                </h2>
                <button
                  className="feed-comment-panel-close"
                  type="button"
                  aria-label="詳細を閉じる"
                  onClick={closeAchievementDetail}
                >
                  ×
                </button>
              </div>

              <div className="achievement-detail-tabs" role="tablist">
                <button
                  className={activeAchievementTab === 'likes' ? 'active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={activeAchievementTab === 'likes'}
                  onClick={() => setActiveAchievementTab('likes')}
                >
                  いいね({activeAchievement.likes})
                </button>
                <button
                  className={
                    activeAchievementTab === 'comments' ? 'active' : ''
                  }
                  type="button"
                  role="tab"
                  aria-selected={activeAchievementTab === 'comments'}
                  onClick={() => setActiveAchievementTab('comments')}
                >
                  コメント({activeAchievement.comments})
                </button>
              </div>

              <div className="feed-comment-panel-task">
                {activeAchievement.task}
              </div>

              {activeAchievementTab === 'likes' ? (
                <ul
                  className="feed-comment-panel-list achievement-detail-list"
                  aria-label="いいねした人"
                >
                  {activeAchievement.likedUsers.map((user) => (
                    <li
                      className={
                        user.afterComplete ? 'achievement-after-complete' : ''
                      }
                      key={user.name}
                    >
                      <div className="feed-comment-author">
                        <span
                          className="feed-comment-avatar"
                          aria-hidden="true"
                        />
                        <span>{user.name}</span>
                        <span className="feed-comment-level">Lv.{user.level}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul
                  className="feed-comment-panel-list"
                  aria-label="コメント一覧"
                >
                  {activeAchievement.commentItems.map((comment) => (
                    <li
                      className={
                        comment.afterComplete
                          ? 'achievement-after-complete'
                          : ''
                      }
                      key={`${comment.name}-${comment.text}`}
                    >
                      <div className="feed-comment-author">
                        <span
                          className="feed-comment-avatar"
                          aria-hidden="true"
                        />
                        <span>{comment.name}</span>
                        <span className="feed-comment-level">
                          Lv.{comment.level}
                        </span>
                      </div>
                      <div className="feed-comment-body">
                        <span>{comment.text}</span>
                        <time>
                          {formatFeedPostAge(
                            new Date(comment.age).getTime(),
                            feedNow,
                          )}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
    )
  }

  if (isProfileOpen) {
    return (
      <main className="home-page profile-page">
        <AppHeader
          title="マイページ"
          rightAction={
            <button
              className="profile-settings-button"
              type="button"
              aria-label="設定"
              onClick={openSettings}
            >
              <img src={settingsIcon} alt="" aria-hidden="true" />
            </button>
          }
        />

        <section className="profile-content" aria-label="マイページ">
          {hasProfileAchievements ? (
            <img
              className="profile-avatar-large"
              src={profileAvatarSrc}
              alt=""
              aria-hidden="true"
            />
          ) : (
            <span className="profile-avatar-large profile-avatar-empty" />
          )}
          <p className="profile-name">{profileName}</p>

          <section className="profile-level-card" aria-label="レベル">
            <div className="profile-level-row">
              <span className="profile-level-label">
                Lv.<strong>{level}</strong>
              </span>
              <span className="profile-level-next">
                あと{remainingToNextLevel}回でLv.{nextLevel}！
              </span>
            </div>
            <div className="profile-level-meter" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="profile-level-percent">{progressPercent}%</span>
          </section>

          {myPageError ? (
            <p className="profile-state-message" role="alert">
              {myPageError}
            </p>
          ) : isMyPageLoading && !myPageData ? (
            <p className="profile-state-message">読み込み中...</p>
          ) : hasProfileAchievements ? (
            <>
              <section
                className="profile-section"
                aria-labelledby="profile-stats-title"
              >
                <h2 id="profile-stats-title">実績</h2>
                <div className="profile-stats-grid">
                  <div className="profile-stat-card">
                    <img src={achievementCheckIcon} alt="" aria-hidden="true" />
                    <strong>{achievementsCount}回</strong>
                    <small>達成</small>
                  </div>
                  <div className="profile-stat-card">
                    <img src={achievementFlameIcon} alt="" aria-hidden="true" />
                    <strong>{myPageData?.streakDays ?? 0}日</strong>
                    <small>連続</small>
                  </div>
                  <div className="profile-stat-card">
                    <img src={likeActiveIcon} alt="" aria-hidden="true" />
                    <strong>{myPageData?.likesCount ?? 0}</strong>
                    <small>いいね</small>
                  </div>
                  <div className="profile-stat-card">
                    <img src={commentIcon} alt="" aria-hidden="true" />
                    <strong>{myPageData?.commentsCount ?? 0}</strong>
                    <small>コメント</small>
                  </div>
                </div>
              </section>

              <section
                className="profile-section"
                aria-labelledby="profile-recent-title"
              >
                <div className="profile-section-heading">
                  <h2 id="profile-recent-title">最近の達成</h2>
                  <a href="/home" onClick={openAchievements}>
                    すべて見る&gt;
                  </a>
                </div>
                <div className="profile-achievement-list">
                  {recentAchievements.map((achievement) => (
                    <article
                      className="profile-achievement-card"
                      key={achievement.id}
                    >
                      <strong>{achievement.task}</strong>
                      <div>
                        <button
                          className="achievement-reaction-button"
                          type="button"
                          onClick={() =>
                            openAchievementDetail(achievement.id, 'likes')
                          }
                        >
                          <img src={likeIcon} alt="" aria-hidden="true" />
                          {achievement.likes}
                        </button>
                        <button
                          className="achievement-reaction-button"
                          type="button"
                          onClick={() =>
                            openAchievementDetail(achievement.id, 'comments')
                          }
                        >
                          <img src={commentIcon} alt="" aria-hidden="true" />
                          {achievement.comments}
                        </button>
                        <time
                          dateTime={new Date(achievement.createdAt).toISOString()}
                        >
                          {formatFeedPostAge(achievement.createdAt, feedNow)}
                        </time>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="profile-empty-state" aria-label="記録なし">
              <h2>まだ記録はありません</h2>
              <p>最初の一歩を始めてみましょう！</p>
              <button type="button" onClick={openHome}>
                最初の一歩を始める
              </button>
            </section>
          )}
        </section>

        {activeAchievement ? (
          <>
            <button
              className="feed-comment-backdrop achievement-detail-backdrop"
              type="button"
              aria-label="詳細を閉じる"
              onClick={closeAchievementDetail}
            />
            <section
              className="feed-comment-panel feed-comment-panel-done achievement-detail-panel"
              aria-labelledby="achievement-detail-title"
            >
              <div className="feed-comment-panel-header">
                <h2 id="achievement-detail-title">
                  {activeAchievementTab === 'likes' ? 'いいね' : 'コメント'}
                </h2>
                <button
                  className="feed-comment-panel-close"
                  type="button"
                  aria-label="詳細を閉じる"
                  onClick={closeAchievementDetail}
                >
                  ×
                </button>
              </div>

              <div className="achievement-detail-tabs" role="tablist">
                <button
                  className={activeAchievementTab === 'likes' ? 'active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={activeAchievementTab === 'likes'}
                  onClick={() => setActiveAchievementTab('likes')}
                >
                  いいね({activeAchievement.likes})
                </button>
                <button
                  className={
                    activeAchievementTab === 'comments' ? 'active' : ''
                  }
                  type="button"
                  role="tab"
                  aria-selected={activeAchievementTab === 'comments'}
                  onClick={() => setActiveAchievementTab('comments')}
                >
                  コメント({activeAchievement.comments})
                </button>
              </div>

              <div className="feed-comment-panel-task">
                {activeAchievement.task}
              </div>

              {activeAchievementTab === 'likes' ? (
                <ul
                  className="feed-comment-panel-list achievement-detail-list"
                  aria-label="いいねした人"
                >
                  {activeAchievement.likedUsers.map((user) => (
                    <li
                      className={
                        user.afterComplete ? 'achievement-after-complete' : ''
                      }
                      key={user.name}
                    >
                      <div className="feed-comment-author">
                        <span
                          className="feed-comment-avatar"
                          aria-hidden="true"
                        />
                        <span>{user.name}</span>
                        <span className="feed-comment-level">Lv.{user.level}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul
                  className="feed-comment-panel-list"
                  aria-label="コメント一覧"
                >
                  {activeAchievement.commentItems.map((comment) => (
                    <li
                      className={
                        comment.afterComplete
                          ? 'achievement-after-complete'
                          : ''
                      }
                      key={`${comment.name}-${comment.text}`}
                    >
                      <div className="feed-comment-author">
                        <span
                          className="feed-comment-avatar"
                          aria-hidden="true"
                        />
                        <span>{comment.name}</span>
                        <span className="feed-comment-level">
                          Lv.{comment.level}
                        </span>
                      </div>
                      <div className="feed-comment-body">
                        <span>{comment.text}</span>
                        <time>
                          {formatFeedPostAge(
                            new Date(comment.age).getTime(),
                            feedNow,
                          )}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}

        <HomeBottomNav
          activeItem="profile"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
      </main>
    )
  }

  if (isFeedOpen) {
    return (
      <main className="home-page feed-page">
        <AppHeader
          title="フィード"
          rightAction={
            isFeedAccessDenied ? null : (
              <time
                className="feed-countdown"
                dateTime={`PT${feedRemainingSeconds}S`}
              >
                <span className="feed-countdown-icon" aria-hidden="true" />
                残り {formatFeedRemainingTime(feedRemainingSeconds)}
              </time>
            )
          }
        />

        <section
          className={`feed-list ${isFeedExpired ? 'feed-list-expired' : ''}`}
          aria-label="みんなの投稿"
          aria-hidden={isFeedExpired ? 'true' : undefined}
        >
          {isFeedAccessDenied ? (
            <section
              className="feed-start-gate"
              aria-labelledby="feed-start-title"
            >
              <div className="feed-start-illustration" aria-hidden="true">
                <span className="feed-sparkle feed-sparkle-one" />
                <span className="feed-sparkle feed-sparkle-two" />
                <span className="feed-sparkle feed-sparkle-three" />
                <span className="feed-sparkle feed-sparkle-four" />
                <span className="feed-sparkle feed-sparkle-five" />
                <span className="feed-paper">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="feed-pencil" />
              </div>
              <div className="feed-start-gate-card">
                <h2 id="feed-start-title">
                  <span className="feed-start-clock" aria-hidden="true" />
                  フィードは5分だけ見られます
                </h2>
                <p>
                  タスクを完了すると、
                  <br />
                  みんなの「やります」「できた」を
                  <br />
                  5分間だけチェックできます。
                </p>
              </div>
              <section
                className="feed-start-guide"
                aria-labelledby="feed-start-guide-title"
              >
                <h3 id="feed-start-guide-title">フィードってなに？</h3>
                <p>
                  みんなの「やります」「できた」を見て、
                  <br />
                  応援したり、コメントしたりできる場所です。
                </p>
                <ol className="feed-start-steps" aria-label="フィードの流れ">
                  <li>
                    <span className="feed-start-step-icon feed-start-step-flag">
                      ⚑
                    </span>
                    <strong>1. やります</strong>
                    <small>タスクを決めて宣言しよう</small>
                  </li>
                  <li>
                    <span className="feed-start-step-icon feed-start-step-check">
                      ✓
                    </span>
                    <strong>2. できた！</strong>
                    <small>タスクが終わったら完了しよう</small>
                  </li>
                  <li>
                    <span className="feed-start-step-icon feed-start-step-heart">
                      ♥
                    </span>
                    <strong>3. フィード解放</strong>
                    <small>完了すると5分間だけ見られる！</small>
                  </li>
                </ol>
              </section>
              <button
                className="feed-expired-start-button"
                type="button"
                onClick={openHome}
              >
                最初の一歩を始める
              </button>
            </section>
          ) : feedError ? (
            <p className="feed-error" role="alert">
              {feedError}
            </p>
          ) : (
            visibleFeedPosts.map((post) => (
              <article
                className={`feed-card feed-card-${post.status}`}
                key={post.id}
              >
                <div className="feed-card-header">
                  <div className="feed-user">
                    <span className="feed-avatar" aria-hidden="true" />
                    <span className="feed-user-name">{post.userName}</span>
                    <span className="feed-user-level">Lv.{post.level}</span>
                  </div>
                  <span className={`feed-status feed-status-${post.status}`}>
                    {post.status === 'done' ? '✓ ' : '⚑ '}
                    {post.statusLabel}
                  </span>
                </div>

                <p className="feed-task">{post.task}</p>

                <div className="feed-card-footer">
                  <button
                    className={`feed-reaction ${post.liked ? 'active' : ''}`}
                    type="button"
                    aria-pressed={post.liked}
                    onClick={() => void togglePostLike(post.id)}
                    disabled={!post.canLike}
                  >
                    <span className="feed-action-icon">
                      <img
                        src={post.liked ? likeActiveIcon : likeIcon}
                        alt=""
                        aria-hidden="true"
                      />
                    </span>
                    <span>{post.likes}</span>
                  </button>
                  <button
                    className={`feed-comment-count ${
                      post.commented ? 'active' : ''
                    }`}
                    type="button"
                    aria-pressed={post.commented}
                    aria-label={`${post.userName}さんのコメントを開く`}
                    onClick={() => openCommentPanel(post.id)}
                    disabled={!post.canComment}
                  >
                    <span className="feed-action-icon">
                      <img
                        src={post.commented ? commentActiveIcon : commentIcon}
                        alt=""
                        aria-hidden="true"
                      />
                    </span>
                    <span>{post.comments.length}</span>
                  </button>
                  <time
                    className="feed-post-age"
                    dateTime={new Date(post.createdAt).toISOString()}
                  >
                    {formatFeedPostAge(post.createdAt, feedNow)}
                  </time>
                </div>
              </article>
            ))
          )}
        </section>

        {isFeedIntroOpen ? (
          <div className="feed-expired-backdrop" role="presentation">
            <section
              className="feed-expired-modal feed-intro-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="feed-intro-title"
            >
              <h2 id="feed-intro-title">利用時間は5分限定！</h2>
              <p>
                みんなの「やります」「できた」にリアクションして応援しましょう！
                <br />
                フィードは5分だけ見られます
              </p>
              <button
                className="feed-expired-start-button"
                type="button"
                onClick={closeFeedIntro}
              >
                OK
              </button>
            </section>
          </div>
        ) : null}

        {isFeedExpired ? (
          <div className="feed-expired-backdrop" role="presentation">
            <section
              className="feed-expired-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="feed-expired-title"
              aria-describedby="feed-expired-description"
            >
              <img
                className="feed-expired-illustration"
                src={feedExpiredClockIcon}
                alt=""
                aria-hidden="true"
              />
              <h2 id="feed-expired-title">5分経過しました</h2>
              <p id="feed-expired-description">
                リフレッシュできましたか？
                <br />
                次の一歩を始めましょう！
              </p>
              <button
                className="feed-expired-start-button"
                type="button"
                onClick={startNextTaskFromExpiredFeed}
              >
                始める
              </button>
            </section>
          </div>
        ) : null}

        <HomeBottomNav
          activeItem="feed"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
        {activeCommentPost ? (
          <>
            <button
              className="feed-comment-backdrop"
              type="button"
              aria-label="コメントを閉じる"
              onClick={closeCommentPanel}
            />
            <section
              className={`feed-comment-panel feed-comment-panel-${activeCommentPost.status}`}
              aria-labelledby="feed-comment-panel-title"
            >
              <div className="feed-comment-panel-header">
                <h2 id="feed-comment-panel-title">コメント</h2>
                <button
                  className="feed-comment-panel-close"
                  type="button"
                  aria-label="コメントを閉じる"
                  onClick={closeCommentPanel}
                >
                  ×
                </button>
              </div>

              <div className="feed-comment-panel-task">
                {activeCommentPost.task}
              </div>

              {activeCommentPost.comments.length > 0 ? (
                <ul
                  className="feed-comment-panel-list"
                  aria-label="コメント一覧"
                >
                  {activeCommentPost.comments.map((comment) => (
                    <li
                      className={`feed-comment-item-${comment.postStatusWhenCommented}`}
                      key={comment.id}
                    >
                      <div className="feed-comment-author">
                        <img
                          className="feed-comment-avatar"
                          src={getAvatarSrc(comment.avatarId)}
                          alt=""
                          aria-hidden="true"
                        />
                        <span>{comment.userName}</span>
                        <span className="feed-comment-level">
                          Lv.{comment.level}
                        </span>
                      </div>
                      <div className="feed-comment-body">
                        <span>{comment.body}</span>
                        <time
                          dateTime={new Date(comment.createdAt).toISOString()}
                        >
                          {formatFeedPostAge(comment.createdAt, feedNow)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="feed-comment-empty">まだコメントはありません</p>
              )}

              <div className="feed-comment-panel-form">
                <input
                  type="text"
                  aria-label={`${activeCommentPost.userName}さんの投稿にコメントする`}
                  placeholder="コメントを入力"
                  value={commentDrafts[activeCommentPost.id] ?? ''}
                  disabled={!activeCommentPost.canComment}
                  onChange={(event) =>
                    handleCommentDraftChange(
                      activeCommentPost.id,
                      event.target.value,
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="コメントを送信"
                  onClick={() => void addPostComment(activeCommentPost.id)}
                  disabled={
                    !activeCommentPost.canComment ||
                    !(commentDrafts[activeCommentPost.id] ?? '').trim()
                  }
                >
                  ➤
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    )
  }

  return (
    <main className={`home-page ${isTaskActive ? 'task-active' : ''}`}>
      {isTaskActive ? null : <AppHeader />}

      {isTaskComplete ? (
        <section
          className="task-complete-screen"
          aria-labelledby="task-complete-title"
        >
          <div className="complete-confetti" aria-hidden="true">
            <div className="cracker-burst cracker-burst-left">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="cracker-burst cracker-burst-right">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>

          <div className="task-complete-content">
            <h1 id="task-complete-title" className="task-complete-title">
              <svg
                className="title-star title-star-left"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M17 2.5L20.8 12.6L31.5 13.1L23.1 19.8L25.9 30.2L17 24.3L8.1 30.2L10.9 19.8L2.5 13.1L13.2 12.6L17 2.5Z" />
              </svg>
              <span>よくできた</span>
              <svg
                className="title-star title-star-right"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M17 2.5L20.8 12.6L31.5 13.1L23.1 19.8L25.9 30.2L17 24.3L8.1 30.2L10.9 19.8L2.5 13.1L13.2 12.6L17 2.5Z" />
              </svg>
            </h1>
            <p className="task-complete-name">{activeTask}</p>

            <div className="task-complete-stats" aria-label="リアクション">
              <span>
                <img src={likeIcon} alt="" aria-hidden="true" />
                {completedTaskReactions.likes}件
              </span>
              <span>
                <img src={commentIcon} alt="" aria-hidden="true" />
                {completedTaskReactions.comments.length}件
              </span>
            </div>

            {hasCompleteComments ? (
              <section className="complete-comments">
                <h2>コメント</h2>
                <div
                  className="complete-comments-scroll"
                  role="region"
                  aria-label="コメント"
                >
                  <ul>
                    {completedTaskReactions.comments.map((comment) => (
                      <li key={comment.id}>
                        <img
                          className="comment-avatar"
                          src={getAvatarSrc(comment.avatarId)}
                          alt=""
                          aria-hidden="true"
                        />
                        <span className="complete-comment-text">
                          {comment.body}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </div>

          <div className="task-complete-actions">
            <a className="complete-feed-button" href="/home" onClick={openFeed}>
              みんなを見る
            </a>
            <button
              className="complete-next-button"
              type="button"
              onClick={handleNextTask}
            >
              次の一歩へ
            </button>
          </div>
        </section>
      ) : isTaskActive ? (
        <section className="focus-session" aria-labelledby="focus-task-title">
          <div className="focus-main">
            <h1 id="focus-task-title">{activeTask}</h1>
            <time className="focus-timer" dateTime={`PT${elapsedSeconds}S`}>
              {formatElapsedTime(elapsedSeconds)}
            </time>
          </div>

          <div className="focus-actions">
            <button
              className="focus-done-button"
              type="button"
              onClick={handleTaskDone}
              disabled={isTaskSubmitting}
            >
              できた！
            </button>
            <button
              className="focus-cancel-button"
              type="button"
              onClick={handleTaskCancel}
            >
              やめる
            </button>
          </div>

          {isCancelConfirmOpen ? (
            <div className="task-cancel-modal-backdrop" role="presentation">
              <div
                className="task-cancel-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-cancel-modal-title"
                aria-describedby="task-cancel-modal-description"
              >
                <h2 id="task-cancel-modal-title">このタスクをやめますか？</h2>
                <p id="task-cancel-modal-description">投稿は削除されます</p>
                <div className="task-cancel-modal-actions">
                  <button
                    className="task-cancel-modal-secondary"
                    type="button"
                    onClick={closeTaskCancelConfirm}
                  >
                    キャンセル
                  </button>
                  <button
                    className="task-cancel-modal-primary"
                    type="button"
                    onClick={confirmTaskCancel}
                  >
                    やめる
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <form
          className="home-start"
          aria-labelledby="home-start-title"
          onSubmit={handleTaskStart}
        >
          <h2 id="home-start-title">今できることから</h2>
          <input
            className={`home-task-input ${taskError ? 'has-error' : ''}`}
            type="text"
            aria-label="今できること"
            aria-invalid={taskError ? 'true' : undefined}
            aria-describedby={taskError ? 'home-task-error' : undefined}
            placeholder="やることを入力"
            value={taskText}
            onChange={(event) => {
              setTaskText(event.target.value)
              if (taskError) {
                setTaskError('')
              }
            }}
          />
          {taskError ? (
            <p className="home-task-error" id="home-task-error" role="alert">
              {taskError}
            </p>
          ) : null}
          <button
            className="home-start-button"
            type="submit"
            disabled={isTaskSubmitting}
          >
            始める
          </button>
        </form>
      )}

      {isTaskActive ? null : (
        <HomeBottomNav
          activeItem="home"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
      )}
    </main>
  )
}

