import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDarkMode } from '../../src/hooks/useDarkMode.js'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})
afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('useDarkMode', () => {
  it('defaults to light mode', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)
  })

  it('restores dark mode from localStorage', () => {
    localStorage.setItem('rpg_dark_mode', 'true')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(true)
  })

  it('restores light mode from localStorage', () => {
    localStorage.setItem('rpg_dark_mode', 'false')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)
  })

  it('toggle switches from light to dark', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(result.current.dark).toBe(true)
  })

  it('toggle switches from dark to light', () => {
    localStorage.setItem('rpg_dark_mode', 'true')
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(result.current.dark).toBe(false)
  })

  it('persists dark mode to localStorage on toggle', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(localStorage.getItem('rpg_dark_mode')).toBe('true')
  })

  it('persists light mode to localStorage on toggle', () => {
    localStorage.setItem('rpg_dark_mode', 'true')
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(localStorage.getItem('rpg_dark_mode')).toBe('false')
  })

  it('sets data-theme="dark" on documentElement when dark', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('removes data-theme attribute when light', () => {
    localStorage.setItem('rpg_dark_mode', 'true')
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('applies data-theme on mount if localStorage says dark', () => {
    localStorage.setItem('rpg_dark_mode', 'true')
    renderHook(() => useDarkMode())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
