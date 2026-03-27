import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearch } from '../../src/hooks/useSearch.js'

vi.useFakeTimers()

describe('useSearch', () => {
  it('starts with empty query', () => {
    const { result } = renderHook(() => useSearch())
    expect(result.current.q).toBe('')
  })

  it('updates inputValue immediately', () => {
    const { result } = renderHook(() => useSearch())
    act(() => result.current.setInput('mausritter'))
    expect(result.current.inputValue).toBe('mausritter')
  })

  it('debounces q by 300ms', async () => {
    const { result } = renderHook(() => useSearch())
    act(() => result.current.setInput('maus'))
    expect(result.current.q).toBe('')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.q).toBe('maus')
  })

  it('does not update q before 300ms', () => {
    const { result } = renderHook(() => useSearch())
    act(() => result.current.setInput('cairn'))
    act(() => vi.advanceTimersByTime(299))
    expect(result.current.q).toBe('')
  })

  it('clears input and q', () => {
    const { result } = renderHook(() => useSearch())
    act(() => result.current.setInput('maus'))
    act(() => vi.advanceTimersByTime(300))
    act(() => result.current.clear())
    expect(result.current.inputValue).toBe('')
    expect(result.current.q).toBe('')
  })
})
