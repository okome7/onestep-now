import { useEffect, useState } from 'react'
import { getLastDisplayedLevelStorageKey } from '../../homePageStorage'

type LevelUpNotificationOptions = {
  enabled: boolean
  userId?: number
  level?: number
}

export function useLevelUpNotification({
  enabled,
  userId,
  level,
}: LevelUpNotificationOptions) {
  const [notificationLevel, setNotificationLevel] = useState<number | null>(
    null,
  )
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (!enabled || !userId || level === undefined) return

    const storageKey = getLastDisplayedLevelStorageKey(userId)
    const storedLevel = Number.parseInt(
      window.localStorage.getItem(storageKey) ?? '',
      10,
    )

    if (!Number.isFinite(storedLevel)) {
      window.localStorage.setItem(storageKey, String(level))
      return
    }
    if (level <= storedLevel) return

    window.localStorage.setItem(storageKey, String(level))
    const showTimerId = window.setTimeout(() => {
      setIsClosing(false)
      setNotificationLevel(level)
    }, 0)

    return () => window.clearTimeout(showTimerId)
  }, [enabled, level, userId])

  useEffect(() => {
    if (notificationLevel === null) return

    const fadeTimerId = window.setTimeout(() => setIsClosing(true), 4000)
    const removeTimerId = window.setTimeout(() => {
      setNotificationLevel(null)
      setIsClosing(false)
    }, 4350)

    return () => {
      window.clearTimeout(fadeTimerId)
      window.clearTimeout(removeTimerId)
    }
  }, [notificationLevel])

  return {
    notificationLevel,
    isClosing,
    dismiss: () => {
      setNotificationLevel(null)
      setIsClosing(false)
    },
  }
}
