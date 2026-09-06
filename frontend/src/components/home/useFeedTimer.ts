import { useCallback, useEffect, useMemo, useState } from 'react'

type FeedTimerOptions = {
  durationSeconds: number
  enabled: boolean
  isFeedOpen: boolean
}

export function useFeedTimer({
  durationSeconds,
  enabled,
  isFeedOpen,
}: FeedTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isTimeoutOpen, setIsTimeoutOpen] = useState(false)

  const expire = useCallback(() => {
    setRemainingSeconds(0)
    setAccessExpiresAt(null)
    setIsTimeoutOpen(true)
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!enabled || isTimeoutOpen || remainingSeconds <= 0) return

    const expirationTimerId = window.setTimeout(expire, remainingSeconds * 1000)
    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const nextSeconds = Math.max(0, current - 1)
        if (nextSeconds === 0) {
          setAccessExpiresAt(null)
          setIsTimeoutOpen(true)
        }
        return nextSeconds
      })
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
      window.clearTimeout(expirationTimerId)
    }
  }, [enabled, expire, isTimeoutOpen, remainingSeconds])

  const start = useCallback((seconds: number, expiresAt?: string | null) => {
    setRemainingSeconds(seconds)
    setAccessExpiresAt(
      expiresAt ? new Date(expiresAt).getTime() : Date.now() + seconds * 1000,
    )
    setIsTimeoutOpen(false)
    setNow(Date.now())
  }, [])

  const reset = useCallback(() => {
    setRemainingSeconds(0)
    setAccessExpiresAt(null)
    setIsTimeoutOpen(false)
  }, [])
  const clearTimeout = useCallback(() => setIsTimeoutOpen(false), [])
  const touch = useCallback(() => setNow(Date.now()), [])
  const hasActiveAccess = useCallback(
    () => accessExpiresAt !== null && accessExpiresAt > Date.now(),
    [accessExpiresAt],
  )

  const elapsedSeconds = Math.min(
    durationSeconds,
    Math.max(0, durationSeconds - remainingSeconds),
  )
  const handAngle = useMemo(
    () => (elapsedSeconds / durationSeconds) * 360,
    [durationSeconds, elapsedSeconds],
  )

  return {
    clearTimeout,
    expire,
    handAngle,
    hasActiveAccess,
    isExpired: isFeedOpen && isTimeoutOpen,
    now,
    remainingSeconds,
    reset,
    start,
    touch,
  }
}
