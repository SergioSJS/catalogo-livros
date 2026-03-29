import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSwipe } from '../../src/hooks/useSwipe.js'

function makeRef(element) {
  return { current: element }
}

function createDiv() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return div
}

function touch(x, y) {
  return { touches: [{ clientX: x, clientY: y }] }
}

describe('useSwipe', () => {
  it('calls onSwipeLeft when swiping left more than threshold', () => {
    const el = createDiv()
    const onLeft = vi.fn()
    renderHook(() => useSwipe(makeRef(el), { onSwipeLeft: onLeft }))

    el.dispatchEvent(new TouchEvent('touchstart', { ...touch(200, 100), bubbles: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [{ clientX: 80, clientY: 100 }], bubbles: true }))

    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeRight when swiping right more than threshold', () => {
    const el = createDiv()
    const onRight = vi.fn()
    renderHook(() => useSwipe(makeRef(el), { onSwipeRight: onRight }))

    el.dispatchEvent(new TouchEvent('touchstart', { ...touch(80, 100), bubbles: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [{ clientX: 200, clientY: 100 }], bubbles: true }))

    expect(onRight).toHaveBeenCalledTimes(1)
  })

  it('does not call swipe callbacks when horizontal delta below threshold', () => {
    const el = createDiv()
    const onLeft = vi.fn()
    const onRight = vi.fn()
    renderHook(() => useSwipe(makeRef(el), { onSwipeLeft: onLeft, onSwipeRight: onRight }))

    el.dispatchEvent(new TouchEvent('touchstart', { ...touch(100, 100), bubbles: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [{ clientX: 130, clientY: 100 }], bubbles: true }))

    expect(onLeft).not.toHaveBeenCalled()
    expect(onRight).not.toHaveBeenCalled()
  })

  it('ignores swipe when vertical delta is larger than horizontal (scroll)', () => {
    const el = createDiv()
    const onLeft = vi.fn()
    renderHook(() => useSwipe(makeRef(el), { onSwipeLeft: onLeft }))

    el.dispatchEvent(new TouchEvent('touchstart', { ...touch(200, 50), bubbles: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [{ clientX: 80, clientY: 200 }], bubbles: true }))

    expect(onLeft).not.toHaveBeenCalled()
  })

  it('removes event listeners on unmount', () => {
    const el = createDiv()
    const onLeft = vi.fn()
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    const { unmount } = renderHook(() => useSwipe(makeRef(el), { onSwipeLeft: onLeft }))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function))
  })

  it('does nothing when ref.current is null', () => {
    const onLeft = vi.fn()
    // Should not throw
    expect(() => renderHook(() => useSwipe({ current: null }, { onSwipeLeft: onLeft }))).not.toThrow()
  })
})
