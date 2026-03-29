import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilters } from '../../src/hooks/useFilters.js'

describe('useFilters', () => {
  it('starts with empty filters', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.filters.systems).toEqual([])
    expect(result.current.filters.language).toBeNull()
    expect(result.current.filters.folder).toBeNull()
  })

  it('toggles a system filter on', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleSystem('OSR'))
    expect(result.current.filters.systems).toContain('OSR')
  })

  it('toggles a system filter off when already active', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleSystem('OSR'))
    act(() => result.current.toggleSystem('OSR'))
    expect(result.current.filters.systems).not.toContain('OSR')
  })

  it('combines multiple systems', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleSystem('OSR'))
    act(() => result.current.toggleSystem('PbtA'))
    expect(result.current.filters.systems).toEqual(['OSR', 'PbtA'])
  })

  it('sets language filter', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setLanguage('pt'))
    expect(result.current.filters.language).toBe('pt')
  })

  it('unsets language when same value passed', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setLanguage('pt'))
    act(() => result.current.setLanguage('pt'))
    expect(result.current.filters.language).toBeNull()
  })

  it('resets all filters', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleSystem('OSR'))
    act(() => result.current.setLanguage('en'))
    act(() => result.current.reset())
    expect(result.current.filters.systems).toEqual([])
    expect(result.current.filters.language).toBeNull()
  })

  it('serializes filters to query params object', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleSystem('OSR'))
    act(() => result.current.setLanguage('en'))
    const params = result.current.toParams()
    expect(params.systems).toEqual(['OSR'])
    expect(params.language).toBe('en')
  })

  it('sets read_status filter', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setReadStatus('read'))
    expect(result.current.filters.read_status).toBe('read')
  })

  it('clears read_status when same value passed again', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setReadStatus('read'))
    act(() => result.current.setReadStatus('read'))
    expect(result.current.filters.read_status).toBeNull()
  })

  it('sets solo_friendly filter', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setSoloFriendly(true))
    expect(result.current.filters.solo_friendly).toBe(true)
  })

  it('sets score_min filter', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setScoreMin(4))
    expect(result.current.filters.score_min).toBe(4)
  })

  it('reset clears personal filters', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setReadStatus('read'))
    act(() => result.current.setSoloFriendly(true))
    act(() => result.current.reset())
    expect(result.current.filters.read_status).toBeNull()
    expect(result.current.filters.solo_friendly).toBeNull()
  })

  it('toParams includes personal filters', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setReadStatus('read'))
    act(() => result.current.setScoreMin(3))
    const params = result.current.toParams()
    expect(params.read_status).toBe('read')
    expect(params.score_min).toBe(3)
  })

  it('toggles a category filter on and off', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleCategory('Core Rulebook'))
    expect(result.current.filters.categories).toContain('Core Rulebook')
    act(() => result.current.toggleCategory('Core Rulebook'))
    expect(result.current.filters.categories).not.toContain('Core Rulebook')
  })

  it('toggles a genre filter on and off', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleGenre('Fantasy'))
    expect(result.current.filters.genres).toContain('Fantasy')
    act(() => result.current.toggleGenre('Fantasy'))
    expect(result.current.filters.genres).not.toContain('Fantasy')
  })

  it('sets folder (does not toggle)', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setFolder('RPG/EN'))
    expect(result.current.filters.folder).toBe('RPG/EN')
    act(() => result.current.setFolder('RPG/EN'))
    expect(result.current.filters.folder).toBe('RPG/EN')
  })

  it('sets sort', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setSort('pages_desc'))
    expect(result.current.filters.sort).toBe('pages_desc')
  })

  it('sets played_status and clears when same value', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setPlayedStatus('played'))
    expect(result.current.filters.played_status).toBe('played')
    act(() => result.current.setPlayedStatus('played'))
    expect(result.current.filters.played_status).toBeNull()
  })

  it('sets score_max', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setScoreMax(3))
    expect(result.current.filters.score_max).toBe(3)
  })

  it('reset clears all filters including categories and genres', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.toggleCategory('Core Rulebook'))
    act(() => result.current.toggleGenre('Fantasy'))
    act(() => result.current.setFolder('RPG/EN'))
    act(() => result.current.setPlayedStatus('played'))
    act(() => result.current.reset())
    expect(result.current.filters.categories).toEqual([])
    expect(result.current.filters.genres).toEqual([])
    expect(result.current.filters.folder).toBeNull()
    expect(result.current.filters.played_status).toBeNull()
  })
})
