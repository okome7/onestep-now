import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type FeedTimerOptions = {
  durationSeconds: number
  enabled: boolean
  isFeedOpen: boolean
}

export function calculateFeedRemainingSeconds(
  initialSeconds: number,
  measuredAt: number,
  now: number,
) {
  return Math.max(
    0,
    Math.ceil(initialSeconds - (now - measuredAt) / 1000),
  )
}

const monotonicNow = () => performance.now()

export function useFeedTimer({
  durationSeconds,
  enabled,
  isFeedOpen,
}: FeedTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isTimeoutOpen, setIsTimeoutOpen] = useState(false)
  const timerBaselineRef = useRef({
    remainingSeconds: 0,
    measuredAt: monotonicNow(),
  })

  const expire = useCallback(() => {
    setRemainingSeconds(0)
    setAccessExpiresAt(null)
    setIsTimeoutOpen(true)
    timerBaselineRef.current = {
      remainingSeconds: 0,
      measuredAt: monotonicNow(),
    }
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!enabled || isTimeoutOpen || remainingSeconds <= 0) return

    const updateRemainingTime = () => {
      const baseline = timerBaselineRef.current
      const nextSeconds = calculateFeedRemainingSeconds(
        baseline.remainingSeconds,
        baseline.measuredAt,
        monotonicNow(),
      )

      if (nextSeconds <= 0) {
        expire()
        return
      }

      setRemainingSeconds((current) => Math.min(current, nextSeconds))
      setNow(Date.now())
    }
    const expirationDelay = remainingSeconds * 1000
    const expirationTimerId = window.setTimeout(expire, expirationDelay)
    const timerId = window.setInterval(updateRemainingTime, 1000)

    return () => {
      window.clearInterval(timerId)
      window.clearTimeout(expirationTimerId)
    }
  }, [
    enabled,
    expire,
    isTimeoutOpen,
    remainingSeconds,
  ])

  const start = useCallback((seconds: number, expiresAt?: string | null) => {
    const normalizedSeconds = Math.max(0, seconds)
    timerBaselineRef.current = {
      remainingSeconds: normalizedSeconds,
      measuredAt: monotonicNow(),
    }
    setRemainingSeconds(normalizedSeconds)
    setAccessExpiresAt(
      expiresAt ? new Date(expiresAt).getTime() : Date.now() + seconds * 1000,
    )
    setIsTimeoutOpen(false)
    setNow(Date.now())
  }, [])

  const reset = useCallback(() => {
    timerBaselineRef.current = {
      remainingSeconds: 0,
      measuredAt: monotonicNow(),
    }
    setRemainingSeconds(0)
    setAccessExpiresAt(null)
    setIsTimeoutOpen(false)
  }, [])
  const clearTimeout = useCallback(() => setIsTimeoutOpen(false), [])
  const touch = useCallback(() => setNow(Date.now()), [])
  const synchronize = useCallback(() => {
    const baseline = timerBaselineRef.current
    const nextSeconds = calculateFeedRemainingSeconds(
      baseline.remainingSeconds,
      baseline.measuredAt,
      monotonicNow(),
    )
    if (nextSeconds <= 0) {
      expire()
      return 0
    }

    setRemainingSeconds((current) => Math.min(current, nextSeconds))
    setNow(Date.now())
    return nextSeconds
  }, [expire])
  const hasActiveAccess = useCallback(
    () => {
      const baseline = timerBaselineRef.current
      return (
        accessExpiresAt !== null &&
        calculateFeedRemainingSeconds(
          baseline.remainingSeconds,
          baseline.measuredAt,
          monotonicNow(),
        ) > 0
      )
    },
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
    synchronize,
    touch,
  }
}
