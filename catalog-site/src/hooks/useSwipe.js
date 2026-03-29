import { useEffect, useRef } from 'react'

const THRESHOLD = 60  // px horizontal delta to trigger swipe

export function useSwipe(ref, { onSwipeLeft, onSwipeRight } = {}) {
  const startX = useRef(null)
  const startY = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onTouchStart(e) {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    function onTouchEnd(e) {
      if (startX.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = e.changedTouches[0].clientY - startY.current
      startX.current = null
      startY.current = null

      // Ignore if vertical movement is dominant (user scrolling)
      if (Math.abs(dy) > Math.abs(dx)) return
      if (Math.abs(dx) < THRESHOLD) return

      if (dx < 0 && onSwipeLeft) onSwipeLeft()
      if (dx > 0 && onSwipeRight) onSwipeRight()
    }

    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, onSwipeLeft, onSwipeRight])
}
