import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { MyPageData } from '../../appTypes'
import { AuthRequiredError } from '../../feedApi'
import {
  fetchMyPage,
  isAbortError,
  isCurrentMyPageResponse,
} from '../../mypageApi'

type MyPageDataOptions = {
  onAuthRequired: () => void
  onLoaded?: () => void
}

export function useMyPageData(
  currentUserId: number | undefined,
  { onAuthRequired, onLoaded }: MyPageDataOptions,
) {
  const currentUserIdRef = useRef(currentUserId)
  const loadedUserIdRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestUserIdRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)
  const requestPromiseRef = useRef<Promise<void> | null>(null)
  const [data, setData] = useState<MyPageData | null>(null)
  const [dataUserId, setDataUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useLayoutEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    requestIdRef.current += 1
    abortControllerRef.current = null
    requestUserIdRef.current = null
    requestPromiseRef.current = null
  }, [])

  const clear = useCallback(() => {
    abort()
    loadedUserIdRef.current = null
    setData(null)
    setDataUserId(null)
    setError('')
    setIsLoading(false)
  }, [abort])

  const load = useCallback(
    (force = false): Promise<void> => {
      const requestUserId = currentUserIdRef.current

      if (!requestUserId) return Promise.resolve()
      if (!force && loadedUserIdRef.current === requestUserId) {
        return Promise.resolve()
      }
      if (
        !force &&
        requestUserIdRef.current === requestUserId &&
        requestPromiseRef.current
      ) {
        return requestPromiseRef.current
      }

      abort()
      const controller = new AbortController()
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      abortControllerRef.current = controller
      requestUserIdRef.current = requestUserId
      setError('')
      setIsLoading(true)

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
              currentUserIdRef.current,
              requestId,
              requestIdRef.current,
              controller.signal,
            )
          ) {
            return
          }

          loadedUserIdRef.current = requestUserId
          setData(result)
          setDataUserId(requestUserId)
          onLoaded?.()
        } catch (caughtError) {
          if (isAbortError(caughtError)) return
          if (
            !isCurrentMyPageResponse(
              requestUserId,
              currentUserIdRef.current,
              requestId,
              requestIdRef.current,
              controller.signal,
            )
          ) {
            return
          }
          if (caughtError instanceof AuthRequiredError) {
            onAuthRequired()
            return
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'マイページ取得に失敗しました。',
          )
        } finally {
          if (requestId === requestIdRef.current) {
            abortControllerRef.current = null
            requestUserIdRef.current = null
            requestPromiseRef.current = null
            setIsLoading(false)
          }
        }
      })()

      requestPromiseRef.current = requestPromise
      return requestPromise
    },
    [abort, onAuthRequired, onLoaded],
  )

  const invalidate = useCallback(
    (userId: number) => {
      if (currentUserIdRef.current !== userId) return false

      abort()
      loadedUserIdRef.current = null
      return true
    },
    [abort],
  )

  const refresh = useCallback(
    (userId: number): Promise<void> => {
      if (!invalidate(userId)) return Promise.resolve()

      return load(true)
    },
    [invalidate, load],
  )

  const selectUser = useCallback((userId: number | undefined) => {
    currentUserIdRef.current = userId
  }, [])

  return {
    abort,
    clear,
    data: dataUserId === currentUserId ? data : null,
    error,
    invalidate,
    isLoading,
    load,
    refresh,
    selectUser,
    setError,
  }
}
