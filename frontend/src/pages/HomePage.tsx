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
import cameraIcon from '../assets/icons/camera.svg'
import iconGridIcon from '../assets/icons/icon-grid.svg'
import settingsIcon from '../assets/icons/settings.svg'
import {
  AchievementDetailPanel,
  AchievementList,
  FeedCommentPanel,
  FeedCountdown,
  FeedExpiredModal,
  FeedIntroModal,
  FeedPostCard,
  FeedStartGate,
  FocusSession,
  HomeStartForm,
  ProfileEmptyState,
  ProfileLevelCard,
  ProfileStatsGrid,
  PostDeleteModal,
  TaskCompleteScreen,
} from '../components/home'
import {
  AppHeader,
  HomeBottomNav,
  UnsavedChangesModal,
} from '../sharedComponents'
import {
  AuthRequiredError,
  FeedAccessDeniedError,
  cancelTask,
  completeTask,
  createComment,
  createTask,
  fetchComments,
  fetchFeed,
  likePost,
  startTask,
  unlikePost,
} from '../feedApi'
import { applyFeedCableEvent, subscribeToFeedUpdates } from '../feedCable'
import {
  deleteCompletionPost,
  fetchMyPage,
  isAbortError,
  isCurrentMyPageResponse,
} from '../mypageApi'

const feedIntroStorageKey = 'onestep-feed-intro-seen'
const activeHomeViewStorageKey = 'onestep-active-home-view'

function getInitialHomeView() {
  return window.sessionStorage.getItem(activeHomeViewStorageKey)
}

export function HomePage() {
  const settingsCameraInputRef = useRef<HTMLInputElement>(null)
  const settingsPhotoInputRef = useRef<HTMLInputElement>(null)
  const feedLoadMoreRef = useRef<HTMLDivElement>(null)
  const deletedFeedPostIdsRef = useRef(new Set<string>())
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
  const [completeProfile, setCompleteProfile] = useState(() =>
    getInitialCompleteProfile(),
  )
  const currentMyPageUserIdRef = useRef<number | undefined>(completeProfile.id)
  const loadedMyPageUserIdRef = useRef<number | null>(null)
  const myPageAbortControllerRef = useRef<AbortController | null>(null)
  const myPageRequestUserIdRef = useRef<number | null>(null)
  const myPageRequestIdRef = useRef(0)
  const myPageRequestPromiseRef = useRef<Promise<void> | null>(null)
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
  const [feedRemainingSeconds, setFeedRemainingSeconds] = useState(0)
  const [feedAccessExpiresAt, setFeedAccessExpiresAt] = useState<number | null>(
    null,
  )
  const [feedNow, setFeedNow] = useState(() => Date.now())
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [isFeedAccessDenied, setIsFeedAccessDenied] = useState(false)
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false)
  const [feedPage, setFeedPage] = useState(1)
  const [hasMoreFeedPosts, setHasMoreFeedPosts] = useState(false)
  const [feedLoadMoreError, setFeedLoadMoreError] = useState('')
  const [isFeedTimeoutModalOpen, setIsFeedTimeoutModalOpen] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [isFeedIntroOpen, setIsFeedIntroOpen] = useState(false)
  const [myPageData, setMyPageData] = useState<MyPageData | null>(null)
  const [myPageDataUserId, setMyPageDataUserId] = useState<number | null>(null)
  const [isMyPageLoading, setIsMyPageLoading] = useState(false)
  const [myPageError, setMyPageError] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  )
  const [commentPage, setCommentPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentsLoadError, setCommentsLoadError] = useState('')
  const isTaskActive = Boolean(activeTask)
  const isTaskRunning = isTaskActive && !isTaskComplete
  const isFeedExpired = isFeedOpen && isFeedTimeoutModalOpen
  const feedCountdownElapsedSeconds = Math.min(
    feedViewDurationSeconds,
    Math.max(0, feedViewDurationSeconds - feedRemainingSeconds),
  )
  const feedCountdownHandAngle =
    (feedCountdownElapsedSeconds / feedViewDurationSeconds) * 360
  const visibleFeedPosts = feedPosts
  const profileAvatarSrc = getCompleteAvatarSrc(completeProfile)
  const profileName = completeProfile.name || 'おこめ'
  const trimmedDisplayNameDraft = displayNameDraft.trim()
  const hasDisplayNameDraftChanged = displayNameDraft !== profileName
  const canSaveDisplayName =
    trimmedDisplayNameDraft.length > 0 &&
    trimmedDisplayNameDraft !== profileName
  const settingsIconPreviewSrc = getAvatarSrc(selectedSettingsIconId)
  const canSaveSettingsIcon =
    selectedSettingsIconId !== completeProfile.avatarId
  const visibleMyPageData =
    myPageDataUserId === completeProfile.id ? myPageData : null
  const level = visibleMyPageData?.level ?? 0
  const nextLevel = visibleMyPageData?.nextLevel ?? 1
  const remainingToNextLevel = visibleMyPageData?.remainingToNextLevel ?? 10
  const progressPercent = visibleMyPageData?.progressPercent ?? 0
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

  useEffect(() => {
    if (!isFeedOpen || isFeedAccessDenied || isFeedLoading || isFeedExpired) {
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
    setFeedLoadMoreError('')
    setIsFeedLoading(true)
    setIsFeedTimeoutModalOpen(false)

    try {
      const result = await fetchFeed(completeProfile.id)
      const nextRemainingSeconds =
        result.remainingSeconds ?? feedViewDurationSeconds
      deletedFeedPostIdsRef.current.clear()
      setFeedPosts(result.posts)
      setFeedPage(result.page)
      setHasMoreFeedPosts(result.hasMore)
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
        setFeedPage(1)
        setHasMoreFeedPosts(false)
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
        setFeedRemainingSeconds(0)
        setFeedAccessExpiresAt(null)
        setIsFeedTimeoutModalOpen(true)
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
  }, [completeProfile.id, feedPage, hasMoreFeedPosts, isFeedLoadingMore])

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

  const abortMyPageRequest = useCallback(() => {
    myPageAbortControllerRef.current?.abort()
    myPageRequestIdRef.current += 1
    myPageAbortControllerRef.current = null
    myPageRequestUserIdRef.current = null
    myPageRequestPromiseRef.current = null
  }, [])

  const clearMyPageCache = useCallback(() => {
    abortMyPageRequest()
    loadedMyPageUserIdRef.current = null
    setMyPageData(null)
    setMyPageDataUserId(null)
    setMyPageError('')
    setIsMyPageLoading(false)
    setActiveAchievementId(null)
    setOpenAchievementMenuId(null)
    setPostPendingDeletionId(null)
  }, [abortMyPageRequest])

  const redirectToLoginForAuthRequired = useCallback(() => {
    clearMyPageCache()
    clearAuthSession()
    window.localStorage.removeItem(signupCompleteStorageKey)
    window.sessionStorage.removeItem(activeHomeViewStorageKey)
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.sessionStorage.removeItem(signupDraftStorageKey)
    window.location.assign('/login')
  }, [clearMyPageCache])

  const loadMyPage = useCallback(
    (force = false): Promise<void> => {
      const requestUserId = currentMyPageUserIdRef.current

      if (!requestUserId) {
        return Promise.resolve()
      }

      if (!force && loadedMyPageUserIdRef.current === requestUserId) {
        return Promise.resolve()
      }

      if (
        !force &&
        myPageRequestUserIdRef.current === requestUserId &&
        myPageRequestPromiseRef.current
      ) {
        return myPageRequestPromiseRef.current
      }

      abortMyPageRequest()
      const controller = new AbortController()
      const requestId = myPageRequestIdRef.current + 1
      myPageRequestIdRef.current = requestId
      myPageAbortControllerRef.current = controller
      myPageRequestUserIdRef.current = requestUserId
      setMyPageError('')
      setIsMyPageLoading(true)

      const requestPromise = (async () => {
        try {
          const result = await fetchMyPage(
            requestUserId,
            undefined,
            controller.signal,
          )

          if (
            !isCurrentMyPageResponse(
              requestUserId,
              currentMyPageUserIdRef.current,
              requestId,
              myPageRequestIdRef.current,
              controller.signal,
            )
          ) {
            return
          }

          loadedMyPageUserIdRef.current = requestUserId
          setMyPageData(result)
          setMyPageDataUserId(requestUserId)
          setFeedNow(Date.now())
        } catch (caughtError) {
          if (isAbortError(caughtError)) {
            return
          }

          if (
            !isCurrentMyPageResponse(
              requestUserId,
              currentMyPageUserIdRef.current,
              requestId,
              myPageRequestIdRef.current,
              controller.signal,
            )
          ) {
            return
          }

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
          if (requestId === myPageRequestIdRef.current) {
            myPageAbortControllerRef.current = null
            myPageRequestUserIdRef.current = null
            myPageRequestPromiseRef.current = null
            setIsMyPageLoading(false)
          }
        }
      })()

      myPageRequestPromiseRef.current = requestPromise
      return requestPromise
    },
    [abortMyPageRequest, redirectToLoginForAuthRequired],
  )

  useLayoutEffect(() => {
    currentMyPageUserIdRef.current = completeProfile.id
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
    if (
      !isFeedOpen ||
      isFeedAccessDenied ||
      isFeedExpired ||
      !completeProfile.cableToken
    ) {
      return undefined
    }

    return subscribeToFeedUpdates({
      token: completeProfile.cableToken,
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
          ),
        )
      },
      onReconnect: () => {
        void loadFeed()
      },
    })
  }, [
    completeProfile.cableToken,
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
      void loadMyPage(true)
    } else if (!visibleMyPageData && !isMyPageLoading) {
      void loadMyPage()
    }
    window.scrollTo({ top: 0, left: 0 })
  }

  function openAchievements(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    window.sessionStorage.setItem(activeHomeViewStorageKey, 'profile')
    if (!visibleMyPageData && !isMyPageLoading) {
      void loadMyPage()
    }
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

  function confirmLogout() {
    clearMyPageCache()
    clearAuthSession()
    window.sessionStorage.removeItem(activeHomeViewStorageKey)
    window.location.href = '/login'
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
      clearMyPageCache()
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

  const saveSettingsIcon = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
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
    },
    [canSaveSettingsIcon, completeProfile, selectedSettingsIconId],
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
    setTaskError('')
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

          return {
            ...post,
            comments:
              page === 1
                ? result.comments
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
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                commented: true,
                commentsCount: post.commentsCount + 1,
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
              onClick={() => setIsSettingsAvatarGridOpen((current) => !current)}
            >
              <img
                className="icon-edit-action-icon icon-edit-action-icon-grid"
                src={iconGridIcon}
                alt=""
                aria-hidden="true"
              />
              <span className="icon-edit-action-text-grid">アイコンを選択</span>
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
                    const hasCustomPhoto =
                      isCustomPhoto && settingsCustomPhotoUrl
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
              <h2 id="account-deleted-modal-title">アカウントを削除しました</h2>
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

        <section className="all-achievements-content" aria-label="すべての達成">
          {myPageError ? (
            <p className="profile-state-message" role="alert">
              {myPageError}
            </p>
          ) : isMyPageLoading && !visibleMyPageData ? (
            <p className="profile-state-message">読み込み中...</p>
          ) : allProfileAchievements.length === 0 ? (
            <p className="profile-state-message">まだ記録はありません</p>
          ) : (
            <AchievementList
              achievements={allProfileAchievements}
              now={feedNow}
              activeAchievementId={activeAchievementId}
              variant="all"
              onOpenDetail={openAchievementDetail}
              openMenuId={openAchievementMenuId}
              onToggleMenu={toggleAchievementMenu}
              onRequestDelete={requestPostDeletion}
            />
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
          <img
            className="profile-avatar-large"
            src={profileAvatarSrc}
            alt=""
            aria-hidden="true"
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
          ) : (
            <ProfileEmptyState onStart={openHome} />
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
