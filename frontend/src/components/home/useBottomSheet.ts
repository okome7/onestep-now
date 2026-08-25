import { useCallback, useEffect, useRef, useState } from 'react'

const BOTTOM_SHEET_ANIMATION_MS = 180

let activeScrollLocks = 0
let originalBodyOverflow = ''
let originalBodyPaddingRight = ''
let originalDocumentOverflow = ''

function restorePageScroll() {
  activeScrollLocks = 0
  document.body.style.overflow = originalBodyOverflow
  document.body.style.paddingRight = originalBodyPaddingRight
  document.documentElement.style.overflow = originalDocumentOverflow
}

export function resetBottomSheetScrollLock() {
  restorePageScroll()
}

function lockBodyScroll() {
  const body = document.body

  if (activeScrollLocks === 0) {
    originalBodyOverflow = body.style.overflow === 'hidden' ? '' : body.style.overflow
    originalBodyPaddingRight = body.style.paddingRight
    originalDocumentOverflow =
      document.documentElement.style.overflow === 'hidden'
        ? ''
        : document.documentElement.style.overflow

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
  }

  activeScrollLocks += 1
  let isReleased = false

  return () => {
    if (isReleased) return

    isReleased = true
    activeScrollLocks = Math.max(0, activeScrollLocks - 1)
    if (activeScrollLocks === 0) {
      restorePageScroll()
    }
  }
}

export function useBottomSheet(onClose: () => void) {
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const isClosingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const releaseScrollLockRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return

    isClosingRef.current = true
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(
      () => {
        releaseScrollLockRef.current?.()
        restorePageScroll()
        onCloseRef.current()
      },
      BOTTOM_SHEET_ANIMATION_MS,
    )
  }, [])

  useEffect(() => {
    releaseScrollLockRef.current = lockBodyScroll()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      releaseScrollLockRef.current?.()
      releaseScrollLockRef.current = null
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [requestClose])

  return { isClosing, requestClose }
}
