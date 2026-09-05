import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import { deleteAccount } from '../accountApi'
import {
  customPhotoIconId,
  feedViewDurationSeconds,
  signupCompleteStorageKey,
  signupDraftStorageKey,
  signupScreenStorageKey,
} from '../appConstants'
import {
  clearAuthSession,
  createAvatarImageDataUrl,
  getAvatarSrc,
  getCompleteAvatarSrc,
  getInitialCompleteProfile,
  isAvatarImageDataUrl,
  saveCompleteProfile,
} from '../appHelpers'
import type { AchievementDetailTab, FeedComment, FeedPost } from '../appTypes'
import settingsIcon from '../assets/icons/settings.svg'
import {
  AchievementDetailPanel,
  AchievementList,
  AchievementsPage,
  FeedCommentPanel,
  FeedCountdown,
  FeedExpiredModal,
  FeedIntroModal,
  FeedPostCard,
  FeedStartGate,
  FocusSession,
  HomeStartForm,
  LevelUpAvatar,
  LevelUpToast,
  ProfileEmptyState,
  ProfileIconEditPage,
  ProfileLevelCard,
  ProfileNameEditPage,
  ProfileStatsGrid,
  SettingsPage,
  PostDeleteModal,
  TaskCompleteScreen,
  useLevelUpNotification,
  useFeedTimer,
  useMyPageData,
} from '../components/home'
import { resetBottomSheetScrollLock } from '../components/home/useBottomSheet'
import { AppHeader, BackIcon, HomeBottomNav } from '../sharedComponents'
import {
  AuthRequiredError,
  FeedAccessDeniedError,
  cancelTask,
  completeTask,
  createComment,
  createTask,
  fetchActiveTask,
  fetchComments,
  fetchFeed,
  startFeedAccess,
  likePost,
  startTask,
  unlikePost,
} from '../feedApi'
import { applyFeedCableEvent, subscribeToFeedUpdates } from '../feedCable'
import {
  activeHomeViewStorageKey,
  feedIntroStorageKey,
  getInitialHomeView,
  getInitialTaskDraft,
  taskDraftStorageKey,
} from '../homePageStorage'
import { fetchCableToken, logoutSession } from '../sessionApi'
import { deleteCompletionPost } from '../mypageApi'
import { updateProfile } from '../profileApi'

export function HomePage() {
  const settingsCameraInputRef = useRef<HTMLInputElement>(null)
  const settingsPhotoInputRef = useRef<HTMLInputElement>(null)
  const feedLoadMoreRef = useRef<HTMLDivElement>(null)
  const deletedFeedPostIdsRef = useRef(new Set<string>())
  const latestLikeEventTimesRef = useRef(new Map<string, number>())
  const [taskText, setTaskText] = useState(getInitialTaskDraft)
  const [taskError, setTaskError] = useState('')
  const [activeTask, setActiveTask] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [activeTaskStartedAt, setActiveTaskStartedAt] = useState<number | null>(
    null,
  )
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTaskComplete, setIsTaskComplete] = useState(false)
  const [isActiveTaskRestoring, setIsActiveTaskRestoring] = useState(true)
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
  const [openAchievementMenuId, setOpenAchievementMenuId] = useState<
    string | null
  >(null)
  const [postPendingDeletionId, setPostPendingDeletionId] = useState<
    string | null
  >(null)
  const [isDeletingPost, setIsDeletingPost] = useState(false)
  const [postDeleteError, setPostDeleteError] = useState('')
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
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')
  const [completeProfile, setCompleteProfile] = useState(() =>
    getInitialCompleteProfile(),
  )
  const [profileUserId, setProfileUserId] = useState(completeProfile.id)
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
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [isFeedAccessDenied, setIsFeedAccessDenied] = useState(false)
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false)
  const [feedPage, setFeedPage] = useState(1)
  const [hasMoreFeedPosts, setHasMoreFeedPosts] = useState(false)
  const [feedLoadMoreError, setFeedLoadMoreError] = useState('')
  const [feedError, setFeedError] = useState('')
  const [isFeedIntroOpen, setIsFeedIntroOpen] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  )
  const [commentPage, setCommentPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentsLoadError, setCommentsLoadError] = useState('')
  const {
    clearTimeout: clearFeedTimeout,
    expire: expireFeed,
    handAngle: feedCountdownHandAngle,
    hasActiveAccess: hasActiveFeedAccess,
    isExpired: isFeedExpired,
    now: feedNow,
    remainingSeconds: feedRemainingSeconds,
    reset: resetFeedTimer,
    start: startFeedTimer,
    touch: touchFeedNow,
  } = useFeedTimer({
    durationSeconds: feedViewDurationSeconds,
    enabled:
      isFeedOpen && !isFeedAccessDenied && !isFeedLoading && !isFeedIntroOpen,
    isFeedOpen,
  })
  const redirectToLoginForAuthRequired = useCallback(() => {
    clearAuthSession()
    window.localStorage.removeItem(signupCompleteStorageKey)
    window.sessionStorage.removeItem(activeHomeViewStorageKey)
    window.sessionStorage.removeItem(taskDraftStorageKey)
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.sessionStorage.removeItem(signupDraftStorageKey)
    window.location.assign('/login')
  }, [])
  const handleMyPageLoaded = touchFeedNow
  const {
    abort: abortMyPageRequest,
    clear: clearMyPageData,
    data: visibleMyPageData,
    error: myPageError,
    invalidate: invalidateMyPageData,
    isLoading: isMyPageLoading,
    load: loadMyPage,
    refresh: refreshMyPageData,
    selectUser: selectMyPageUser,
    setError: setMyPageError,
  } = useMyPageData(profileUserId, {
    onAuthRequired: redirectToLoginForAuthRequired,
    onLoaded: handleMyPageLoaded,
  })
  const isTaskActive = Boolean(activeTask)
  const isTaskRunning = isTaskActive && !isTaskComplete
  const visibleFeedPosts = feedPosts
  const isViewingOwnProfile = profileUserId === completeProfile.id
  const profileAvatarSrc = visibleMyPageData
    ? getAvatarSrc(visibleMyPageData.user.avatarId)
    : getCompleteAvatarSrc(completeProfile)
  const profileName =
    visibleMyPageData?.user.name || completeProfile.name || 'おこめ'
  const trimmedDisplayNameDraft = displayNameDraft.trim()
  const hasDisplayNameDraftChanged = displayNameDraft !== profileName
  const canSaveDisplayName =
    trimmedDisplayNameDraft.length > 0 &&
    trimmedDisplayNameDraft !== profileName
  const settingsIconPreviewSrc = getAvatarSrc(selectedSettingsIconId)
  const canSaveSettingsIcon =
    selectedSettingsIconId !== completeProfile.avatarId
  const level = visibleMyPageData?.level ?? 0
  const nextLevel = visibleMyPageData?.nextLevel ?? 1
  const remainingToNextLevel = visibleMyPageData?.remainingToNextLevel ?? 10
  const progressPercent = visibleMyPageData?.progressPercent ?? 0
  const {
    notificationLevel: levelUpNotificationLevel,
    isClosing: isLevelUpNotificationClosing,
    dismiss: dismissLevelUpNotification,
  } = useLevelUpNotification({
    enabled: isProfileOpen && isViewingOwnProfile,
    userId: completeProfile.id,
    level: visibleMyPageData?.level,
  })
  const achievementsCount = visibleMyPageData?.achievementsCount ?? 0
  const hasProfileAchievements = achievementsCount > 0
  const allProfileAchievements = visibleMyPageData?.allAchievements ?? []
  const recentAchievements = visibleMyPageData?.recentAchievements ?? []
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

  useEffect(() => {
    if (activeAchievementId === null && activeCommentPostId === null) {
      resetBottomSheetScrollLock()
    }
  }, [activeAchievementId, activeCommentPostId])

  function upsertOwnTaskPost(task: {
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
  }) {
    const completionPost = task.completion_post
    const postId = completionPost?.id ?? task.completion_post_id

    if (!postId) {
      return
    }

    const nextPost: FeedPost = {
      id: String(postId),
      userName: 'あなた',
      avatarId: completeProfile.avatarId,
      level: 1,
      task: task.title,
      status: completionPost?.card_variant === 'completed' ? 'done' : 'doing',
      statusLabel:
        completionPost?.status_label ??
        (completionPost?.card_variant === 'completed' ? 'できた' : 'やります'),
      likes: completionPost?.likes_count ?? 0,
      commentsCount: completionPost?.comments_count ?? 0,
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
              commentsCount:
                completionPost?.comments_count ?? post.commentsCount,
              comments: completionPost?.comments
                ? nextPost.comments
                : post.comments,
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

    const updateElapsedSeconds = () => {
      if (activeTaskStartedAt === null) {
        return
      }

      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activeTaskStartedAt) / 1000)),
      )
    }

    updateElapsedSeconds()
    const timerId = window.setInterval(() => {
      updateElapsedSeconds()
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [activeTaskStartedAt, isTaskRunning])

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
    if (!activeAchievement) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [activeAchievement])

  useEffect(() => {
    if (!isFeedExpired) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [isFeedExpired])

  const loadFeed = useCallback(async () => {
    setFeedError('')
    setFeedLoadMoreError('')
    setIsFeedLoading(true)
    clearFeedTimeout()

    try {
      const result = await fetchFeed(completeProfile.id)
      const nextRemainingSeconds =
        result.remainingSeconds ?? feedViewDurationSeconds
      deletedFeedPostIdsRef.current.clear()
      setFeedPosts(result.posts)
      setFeedPage(result.page)
      setHasMoreFeedPosts(result.hasMore)
      startFeedTimer(nextRemainingSeconds, result.feedAccessExpiresAt)
      setIsFeedAccessDenied(false)

      if (!window.localStorage.getItem(feedIntroStorageKey)) {
        setIsFeedIntroOpen(true)
      }
    } catch (caughtError) {
      if (caughtError instanceof FeedAccessDeniedError) {
        setFeedPosts([])
        setFeedPage(1)
        setHasMoreFeedPosts(false)
        resetFeedTimer()
        setIsFeedAccessDenied(true)
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
  }, [clearFeedTimeout, completeProfile.id, resetFeedTimer, startFeedTimer])

  const loadMoreFeed = useCallback(async () => {
    if (isFeedLoadingMore || !hasMoreFeedPosts) {
      return
    }

    setIsFeedLoadingMore(true)
    setFeedLoadMoreError('')

    try {
      const result = await fetchFeed(
        completeProfile.id,
        undefined,
        feedPage + 1,
      )
      setFeedPosts((currentPosts) => {
        const existingIds = new Set(currentPosts.map((post) => post.id))
        return [
          ...currentPosts,
          ...result.posts.filter((post) => !existingIds.has(post.id)),
        ]
      })
      setFeedPage(result.page)
      setHasMoreFeedPosts(result.hasMore)
    } catch (caughtError) {
      if (caughtError instanceof FeedAccessDeniedError) {
        expireFeed()
        return
      }

      setFeedLoadMoreError(
        caughtError instanceof Error
          ? caughtError.message
          : '次の投稿の取得に失敗しました。',
      )
    } finally {
      setIsFeedLoadingMore(false)
    }
  }, [
    completeProfile.id,
    expireFeed,
    feedPage,
    hasMoreFeedPosts,
    isFeedLoadingMore,
  ])

  useEffect(() => {
    const target = feedLoadMoreRef.current

    if (
      !isFeedOpen ||
      isFeedExpired ||
      !hasMoreFeedPosts ||
      feedLoadMoreError ||
      !target
    ) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreFeed()
        }
      },
      { rootMargin: '200px 0px' },
    )
    observer.observe(target)

    return () => observer.disconnect()
  }, [
    feedLoadMoreError,
    hasMoreFeedPosts,
    isFeedExpired,
    isFeedOpen,
    loadMoreFeed,
  ])

  const clearMyPageCache = useCallback(() => {
    clearMyPageData()
    setActiveAchievementId(null)
    setOpenAchievementMenuId(null)
    setPostPendingDeletionId(null)
  }, [clearMyPageData])

  useEffect(() => {
    let isCancelled = false

    async function restoreActiveTask() {
      if (!completeProfile.id) {
        setIsActiveTaskRestoring(false)
        return
      }

      try {
        const task = await fetchActiveTask(completeProfile.id)
        if (isCancelled || !task) return

        const startedAt = task.started_at
          ? new Date(task.started_at).getTime()
          : Date.now()
        setActiveTaskId(task.id)
        setActiveTask(task.title)
        setActiveTaskStartedAt(startedAt)
        setElapsedSeconds(
          Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
        )
        setIsTaskComplete(false)
        setCompletedTaskReactions({ likes: 0, comments: [] })
        setIsFeedOpen(false)
        setIsProfileOpen(false)
        setIsAchievementsOpen(false)
        setIsSettingsOpen(false)
        setIsNameEditOpen(false)
        setIsIconEditOpen(false)
        window.sessionStorage.removeItem(activeHomeViewStorageKey)
      } catch (caughtError) {
        if (caughtError instanceof AuthRequiredError) {
          redirectToLoginForAuthRequired()
          return
        }

        if (!isCancelled) {
          setTaskError(
            caughtError instanceof Error
              ? caughtError.message
              : '進行中のタスク取得に失敗しました。',
          )
        }
      } finally {
        if (!isCancelled) setIsActiveTaskRestoring(false)
      }
    }

    void restoreActiveTask()
    return () => {
      isCancelled = true
    }
  }, [completeProfile.id, redirectToLoginForAuthRequired])

  useLayoutEffect(() => {
    selectMyPageUser(completeProfile.id)
  }, [completeProfile.id, selectMyPageUser])

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
    if (
      !isFeedOpen ||
      isFeedAccessDenied ||
      isFeedExpired ||
      !completeProfile.id
    ) {
      return undefined
    }

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    void fetchCableToken()
      .then((token) => {
        if (cancelled) return

        unsubscribe = subscribeToFeedUpdates({
          token,
          onEvent: (event) => {
            if (event.type === 'post_deleted') {
              deletedFeedPostIdsRef.current.add(String(event.post_id))
            }

            setFeedPosts((currentPosts) =>
              applyFeedCableEvent(
                currentPosts,
                event,
                completeProfile.id,
                deletedFeedPostIdsRef.current,
                latestLikeEventTimesRef.current,
              ),
            )
          },
          onReconnect: () => {
            void loadFeed()
          },
        })
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [
    completeProfile.id,
    isFeedAccessDenied,
    isFeedExpired,
    isFeedOpen,
    loadFeed,
  ])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      clearMyPageCache()
      if (completeProfile.id) {
        void loadMyPage()
      }
    }, 0)

    return () => {
      window.clearTimeout(timerId)
      abortMyPageRequest()
    }
  }, [abortMyPageRequest, clearMyPageCache, completeProfile.id, loadMyPage])

  async function closeFeedIntro() {
    try {
      const result = await startFeedAccess(completeProfile.id)
      const remainingSeconds =
        result.remaining_seconds ?? feedViewDurationSeconds
      startFeedTimer(remainingSeconds, result.feed_access_expires_at)
      window.localStorage.setItem(feedIntroStorageKey, 'true')
      setIsFeedIntroOpen(false)
    } catch (caughtError) {
      setFeedError(
        caughtError instanceof Error
          ? caughtError.message
          : 'フィードを開始できませんでした。',
      )
    }
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
    const hasKnownFeedAccess = hasActiveFeedAccess()
    if (!hasKnownFeedAccess) {
      setFeedPosts([])
      resetFeedTimer()
    }
    setFeedError('')
    setIsFeedAccessDenied(!hasKnownFeedAccess)
    clearFeedTimeout()
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
    clearFeedTimeout()
    setFeedError('')
    if (isTaskComplete) {
      handleNextTask()
    }
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
    clearFeedTimeout()
    handleNextTask()
    window.scrollTo({ top: 0, left: 0 })
  }

  function openProfile(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault()
    selectMyPageUser(completeProfile.id)
    setProfileUserId(completeProfile.id)
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
    void loadMyPage(isProfileOpen)
    window.scrollTo({ top: 0, left: 0 })
  }

  function openFeedUserProfile(userId: number) {
    selectMyPageUser(userId)
    setProfileUserId(userId)
    dismissLevelUpNotification()
    setIsFeedOpen(false)
    setIsProfileOpen(true)
    setIsAchievementsOpen(false)
    setActiveAchievementId(null)
    setMyPageError('')
    void loadMyPage()
    window.scrollTo({ top: 0, left: 0 })
  }

  function returnToFeedFromProfile() {
    setIsProfileOpen(false)
    setIsFeedOpen(true)
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
    resetBottomSheetScrollLock()
    setActiveAchievementId(null)
  }

  const toggleAchievementMenu = useCallback((achievementId: string) => {
    setOpenAchievementMenuId((currentId) =>
      currentId === achievementId ? null : achievementId,
    )
  }, [])

  function requestPostDeletion(achievementId: string) {
    setOpenAchievementMenuId(null)
    setPostPendingDeletionId(achievementId)
    setPostDeleteError('')
  }

  function cancelPostDeletion() {
    if (isDeletingPost) {
      return
    }

    setPostPendingDeletionId(null)
    setPostDeleteError('')
  }

  async function confirmPostDeletion() {
    if (!postPendingDeletionId || isDeletingPost) {
      return
    }

    const deletedPostId = postPendingDeletionId
    setIsDeletingPost(true)
    setPostDeleteError('')

    try {
      await deleteCompletionPost(deletedPostId, completeProfile.id)
      deletedFeedPostIdsRef.current.add(deletedPostId)
      setFeedPosts((currentPosts) =>
        currentPosts.filter((post) => post.id !== deletedPostId),
      )
      setActiveAchievementId((currentId) =>
        currentId === deletedPostId ? null : currentId,
      )
      setPostPendingDeletionId(null)
      await loadMyPage(true)
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      setPostDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : '投稿の削除に失敗しました。',
      )
    } finally {
      setIsDeletingPost(false)
    }
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

  async function confirmLogout() {
    try {
      await logoutSession()
      clearMyPageCache()
      clearAuthSession()
      window.localStorage.removeItem(signupCompleteStorageKey)
      window.sessionStorage.removeItem(activeHomeViewStorageKey)
      window.sessionStorage.removeItem(taskDraftStorageKey)
      window.location.href = '/login'
    } catch {
      setIsLogoutConfirmOpen(false)
    }
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
      await deleteAccount()
      clearMyPageCache()
      clearAuthSession()
      window.localStorage.removeItem(signupCompleteStorageKey)
      window.sessionStorage.removeItem(activeHomeViewStorageKey)
      window.sessionStorage.removeItem(taskDraftStorageKey)
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
    setProfileSaveError('')
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

    setProfileSaveError('')
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

  const saveSettingsIcon = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()

      if (!canSaveSettingsIcon || isProfileSaving) {
        return
      }

      setIsProfileSaving(true)
      setProfileSaveError('')
      try {
        const user = await updateProfile({ avatarKey: selectedSettingsIconId })
        const nextProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarId: user.avatar_key ?? selectedSettingsIconId,
        }
        setCompleteProfile(nextProfile)
        saveCompleteProfile(nextProfile)
        setIsIconEditOpen(false)
        setIsSettingsOpen(true)
        setIsSettingsAvatarGridOpen(false)
        setIsIconDiscardConfirmOpen(false)
        window.scrollTo({ top: 0, left: 0 })
      } catch (error) {
        setProfileSaveError(
          error instanceof Error
            ? error.message
            : 'プロフィールの保存に失敗しました。',
        )
      } finally {
        setIsProfileSaving(false)
      }
    },
    [canSaveSettingsIcon, isProfileSaving, selectedSettingsIconId],
  )

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

  async function handleSettingsPhotoChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
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

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSaveDisplayName || isProfileSaving) {
      return
    }

    setIsProfileSaving(true)
    setProfileSaveError('')
    try {
      const user = await updateProfile({ name: trimmedDisplayNameDraft })
      const nextProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarId: user.avatar_key ?? completeProfile.avatarId,
      }
      setCompleteProfile(nextProfile)
      saveCompleteProfile(nextProfile)
      setIsNameEditOpen(false)
      setIsSettingsOpen(true)
      setIsNameDiscardConfirmOpen(false)
      window.scrollTo({ top: 0, left: 0 })
    } catch (error) {
      setProfileSaveError(
        error instanceof Error
          ? error.message
          : 'プロフィールの保存に失敗しました。',
      )
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function handleTaskStart() {
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
      const startedAt = startedTask.started_at
        ? new Date(startedTask.started_at).getTime()
        : Date.now()
      setActiveTaskId(startedTask.id)
      setActiveTask(startedTask.title)
      setTaskText('')
      window.sessionStorage.removeItem(taskDraftStorageKey)
      setActiveTaskStartedAt(startedAt)
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

  async function confirmTaskCancel() {
    if (isTaskSubmitting) {
      return
    }

    if (activeTaskId) {
      setIsTaskSubmitting(true)

      try {
        await cancelTask(activeTaskId, completeProfile.id)
      } catch (caughtError) {
        if (caughtError instanceof AuthRequiredError) {
          redirectToLoginForAuthRequired()
          return
        }

        setTaskError(
          caughtError instanceof Error
            ? caughtError.message
            : 'タスクの中止に失敗しました。',
        )
        return
      } finally {
        setIsTaskSubmitting(false)
      }
    }

    setTaskText('')
    window.sessionStorage.removeItem(taskDraftStorageKey)
    setTaskError('')
    setActiveTask('')
    setActiveTaskId(null)
    setActiveTaskStartedAt(null)
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
      const completedTask = await completeTask(
        activeTaskId,
        completeProfile.id,
        !window.localStorage.getItem(feedIntroStorageKey),
      )
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
      void refreshMyPageData(completeProfile.id)
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
    window.sessionStorage.removeItem(taskDraftStorageKey)
    setTaskError('')
    setActiveTask('')
    setActiveTaskId(null)
    setActiveTaskStartedAt(null)
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
      if (completeProfile.id) {
        invalidateMyPageData(completeProfile.id)
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

  async function loadPostComments(postId: string, page: number) {
    if (isCommentsLoading) {
      return
    }

    setIsCommentsLoading(true)
    setCommentsLoadError('')

    try {
      const result = await fetchComments(postId, completeProfile.id, page)
      setFeedPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id !== postId) {
            return post
          }

          const existingIds = new Set(
            post.comments.map((comment) => comment.id),
          )
          const nextComments = result.comments.filter(
            (comment) => !existingIds.has(comment.id),
          )
          const firstPageComments = [
            ...result.comments,
            ...post.comments.filter(
              (comment) =>
                !result.comments.some(
                  (loadedComment) => loadedComment.id === comment.id,
                ),
            ),
          ].sort(
            (left, right) =>
              left.createdAt - right.createdAt ||
              left.id.localeCompare(right.id),
          )

          return {
            ...post,
            comments:
              page === 1
                ? firstPageComments
                : [...nextComments, ...post.comments],
          }
        }),
      )
      setCommentPage(result.page)
      setHasMoreComments(result.hasMore)
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      setCommentsLoadError(
        caughtError instanceof Error
          ? caughtError.message
          : 'コメントの取得に失敗しました。',
      )
    } finally {
      setIsCommentsLoading(false)
    }
  }

  function openCommentPanel(postId: string) {
    setActiveCommentPostId(postId)
    setCommentPage(1)
    setHasMoreComments(false)
    setCommentsLoadError('')
    setFeedPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId ? { ...post, comments: [] } : post,
      ),
    )
    void loadPostComments(postId, 1)
  }

  function closeCommentPanel() {
    setActiveCommentPostId(null)
    setCommentsLoadError('')
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
        currentPosts.map((post) => {
          if (post.id !== postId) {
            return post
          }

          const alreadyAdded = post.comments.some(
            (comment) => comment.id === createdComment.id,
          )

          return {
            ...post,
            commented: true,
            commentsCount: alreadyAdded
              ? post.commentsCount
              : post.commentsCount + 1,
            comments: alreadyAdded
              ? post.comments
              : [...post.comments, createdComment],
          }
        }),
      )
      setCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [postId]: '',
      }))
      if (completeProfile.id) {
        invalidateMyPageData(completeProfile.id)
      }
    } catch (caughtError) {
      if (caughtError instanceof AuthRequiredError) {
        redirectToLoginForAuthRequired()
        return
      }

      await loadFeed()
    }
  }

  if (isActiveTaskRestoring) {
    return null
  }

  if (isSettingsOpen && isNameEditOpen) {
    return (
      <ProfileNameEditPage
        displayNameDraft={displayNameDraft}
        canSave={canSaveDisplayName}
        isSaving={isProfileSaving}
        saveError={profileSaveError}
        isDiscardConfirmOpen={isNameDiscardConfirmOpen}
        onBack={closeNameEdit}
        onChange={setDisplayNameDraft}
        onSubmit={saveDisplayName}
        onContinue={continueNameEdit}
        onDiscard={discardNameEdit}
      />
    )
  }

  if (isSettingsOpen && isIconEditOpen) {
    return (
      <ProfileIconEditPage
        cameraInputRef={settingsCameraInputRef}
        photoInputRef={settingsPhotoInputRef}
        previewSrc={settingsIconPreviewSrc}
        selectedIconId={selectedSettingsIconId}
        customPhotoUrl={settingsCustomPhotoUrl}
        canSave={canSaveSettingsIcon}
        isSaving={isProfileSaving}
        saveError={profileSaveError}
        isAvatarGridOpen={isSettingsAvatarGridOpen}
        isCameraAvailable={isSettingsCameraAvailable}
        isDiscardConfirmOpen={isIconDiscardConfirmOpen}
        onBack={closeIconEdit}
        onSubmit={saveSettingsIcon}
        onToggleAvatarGrid={() =>
          setIsSettingsAvatarGridOpen((current) => !current)
        }
        onCloseAvatarGrid={() => setIsSettingsAvatarGridOpen(false)}
        onAvatarClick={handleSettingsAvatarClick}
        onPhotoChange={handleSettingsPhotoChange}
        onContinue={continueIconEdit}
        onDiscard={discardIconEdit}
      />
    )
  }
  if (isSettingsOpen) {
    return (
      <SettingsPage
        isLogoutConfirmOpen={isLogoutConfirmOpen}
        isAccountDeleteConfirmOpen={isAccountDeleteConfirmOpen}
        isAccountDeletedOpen={isAccountDeletedOpen}
        isDeletingAccount={isDeletingAccount}
        accountDeleteError={accountDeleteError}
        onBack={closeSettings}
        onOpenNameEdit={openNameEdit}
        onOpenIconEdit={openIconEdit}
        onOpenLogoutConfirm={openLogoutConfirm}
        onCloseLogoutConfirm={closeLogoutConfirm}
        onConfirmLogout={() => void confirmLogout()}
        onOpenAccountDeleteConfirm={openAccountDeleteConfirm}
        onCloseAccountDeleteConfirm={closeAccountDeleteConfirm}
        onConfirmAccountDelete={() => void confirmAccountDelete()}
        onGoToLogin={goToLoginAfterAccountDelete}
      />
    )
  }
  if (isAchievementsOpen) {
    return (
      <AchievementsPage
        achievements={allProfileAchievements}
        now={feedNow}
        activeAchievement={activeAchievement}
        activeAchievementId={activeAchievementId}
        activeTab={activeAchievementTab}
        openMenuId={openAchievementMenuId}
        error={myPageError}
        isLoading={isMyPageLoading}
        hasLoadedData={Boolean(visibleMyPageData)}
        isDeleteModalOpen={Boolean(postPendingDeletionId)}
        isDeleting={isDeletingPost}
        deleteError={postDeleteError}
        onBack={closeAchievements}
        onOpenDetail={openAchievementDetail}
        onCloseDetail={closeAchievementDetail}
        onTabChange={setActiveAchievementTab}
        onToggleMenu={toggleAchievementMenu}
        onRequestDelete={requestPostDeletion}
        onCancelDelete={cancelPostDeletion}
        onConfirmDelete={() => void confirmPostDeletion()}
      />
    )
  }
  if (isProfileOpen) {
    return (
      <main className="home-page profile-page">
        <AppHeader
          title="マイページ"
          leftAction={
            isViewingOwnProfile ? null : (
              <button
                className="profile-back-button"
                type="button"
                aria-label="フィードに戻る"
                onClick={returnToFeedFromProfile}
              >
                <BackIcon />
              </button>
            )
          }
          rightAction={
            isViewingOwnProfile ? (
              <button
                className="profile-settings-button"
                type="button"
                aria-label="設定"
                onClick={openSettings}
              >
                <img src={settingsIcon} alt="" aria-hidden="true" />
              </button>
            ) : null
          }
        />

        <LevelUpToast
          isClosing={isLevelUpNotificationClosing}
          level={levelUpNotificationLevel}
          onDismiss={dismissLevelUpNotification}
        />

        <section className="profile-content" aria-label="マイページ">
          <LevelUpAvatar
            avatarSrc={profileAvatarSrc}
            isLevelingUp={levelUpNotificationLevel !== null}
          />
          <p className="profile-name">{profileName}</p>

          <ProfileLevelCard
            level={level}
            nextLevel={nextLevel}
            remainingToNextLevel={remainingToNextLevel}
            progressPercent={progressPercent}
          />

          {myPageError ? (
            <p className="profile-state-message" role="alert">
              {myPageError}
            </p>
          ) : isMyPageLoading && !visibleMyPageData ? (
            <p className="profile-state-message">読み込み中...</p>
          ) : hasProfileAchievements ? (
            <>
              <section
                className="profile-section"
                aria-labelledby="profile-stats-title"
              >
                <h2 id="profile-stats-title">実績</h2>
                <ProfileStatsGrid
                  achievementsCount={achievementsCount}
                  streakDays={visibleMyPageData?.streakDays ?? 0}
                  likesCount={visibleMyPageData?.likesCount ?? 0}
                  commentsCount={visibleMyPageData?.commentsCount ?? 0}
                />
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
                <AchievementList
                  achievements={recentAchievements}
                  now={feedNow}
                  onOpenDetail={openAchievementDetail}
                  openMenuId={openAchievementMenuId}
                  onToggleMenu={toggleAchievementMenu}
                  onRequestDelete={requestPostDeletion}
                />
              </section>
            </>
          ) : isViewingOwnProfile ? (
            <ProfileEmptyState onStart={openHome} />
          ) : (
            <section className="profile-empty-state" aria-label="記録なし">
              <h2>まだ記録はありません</h2>
            </section>
          )}
        </section>

        {activeAchievement ? (
          <AchievementDetailPanel
            achievement={activeAchievement}
            activeTab={activeAchievementTab}
            now={feedNow}
            onClose={closeAchievementDetail}
            onTabChange={setActiveAchievementTab}
          />
        ) : null}

        {postPendingDeletionId ? (
          <PostDeleteModal
            isDeleting={isDeletingPost}
            error={postDeleteError}
            onCancel={cancelPostDeletion}
            onConfirm={() => void confirmPostDeletion()}
          />
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
              <FeedCountdown
                remainingSeconds={feedRemainingSeconds}
                handAngle={feedCountdownHandAngle}
              />
            )
          }
        />

        <section
          className={`feed-list ${isFeedExpired ? 'feed-list-expired' : ''}`}
          aria-label="みんなの投稿"
          aria-hidden={isFeedExpired ? 'true' : undefined}
        >
          {isFeedAccessDenied ? (
            <FeedStartGate onStart={openHome} />
          ) : feedError ? (
            <p className="feed-error" role="alert">
              {feedError}
            </p>
          ) : (
            <>
              {visibleFeedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  now={feedNow}
                  onLike={(postId) => void togglePostLike(postId)}
                  onOpenComments={openCommentPanel}
                  onOpenProfile={openFeedUserProfile}
                />
              ))}
              {hasMoreFeedPosts ? (
                <div
                  ref={feedLoadMoreRef}
                  className="feed-load-more"
                  aria-label="次の投稿を読み込み中"
                >
                  {feedLoadMoreError ? (
                    <button type="button" onClick={() => void loadMoreFeed()}>
                      再読み込み
                    </button>
                  ) : isFeedLoadingMore ? (
                    '読み込み中…'
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>

        {isFeedIntroOpen ? <FeedIntroModal onClose={closeFeedIntro} /> : null}

        {isFeedExpired ? (
          <FeedExpiredModal onStart={startNextTaskFromExpiredFeed} />
        ) : null}

        <HomeBottomNav
          activeItem="feed"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
        {activeCommentPost ? (
          <FeedCommentPanel
            post={activeCommentPost}
            draft={commentDrafts[activeCommentPost.id] ?? ''}
            now={feedNow}
            onClose={closeCommentPanel}
            onDraftChange={handleCommentDraftChange}
            onSubmit={(postId) => void addPostComment(postId)}
            isLoading={isCommentsLoading}
            hasMore={hasMoreComments}
            error={commentsLoadError}
            onLoadMore={() =>
              void loadPostComments(activeCommentPost.id, commentPage + 1)
            }
          />
        ) : null}
      </main>
    )
  }

  return (
    <main className={`home-page ${isTaskActive ? 'task-active' : ''}`}>
      {isTaskActive ? null : <AppHeader />}

      {isTaskComplete ? (
        <TaskCompleteScreen
          activeTask={activeTask}
          likes={completedTaskReactions.likes}
          comments={completedTaskReactions.comments}
          onOpenFeed={openFeed}
          onNextTask={handleNextTask}
        />
      ) : isTaskActive ? (
        <FocusSession
          activeTask={activeTask}
          elapsedSeconds={elapsedSeconds}
          isSubmitting={isTaskSubmitting}
          isCancelConfirmOpen={isCancelConfirmOpen}
          onDone={handleTaskDone}
          onCancel={handleTaskCancel}
          onCloseCancelConfirm={closeTaskCancelConfirm}
          onConfirmCancel={confirmTaskCancel}
        />
      ) : (
        <HomeStartForm
          taskText={taskText}
          taskError={taskError}
          isSubmitting={isTaskSubmitting}
          onTaskTextChange={(value) => {
            setTaskText(value)
            if (value) {
              window.sessionStorage.setItem(taskDraftStorageKey, value)
            } else {
              window.sessionStorage.removeItem(taskDraftStorageKey)
            }
            if (taskError) {
              setTaskError('')
            }
          }}
          onStart={handleTaskStart}
        />
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
