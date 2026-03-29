import { useState, useCallback, useEffect } from 'react'

const LS_KEY = 'rpg_filters'

const INITIAL = {
  systems: [], categories: [], genres: [], tags: [],
  systems_not: [], categories_not: [], genres_not: [], tags_not: [],
  language: null, folder: null, sort: 'title_asc',
  read_status: null, played_status: null, solo_friendly: null,
  score_min: null, score_max: null,
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return INITIAL
    return { ...INITIAL, ...JSON.parse(raw) }
  } catch {
    return INITIAL
  }
}

export function useFilters() {
  const [filters, setFilters] = useState(loadFilters)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(filters)) } catch {}
  }, [filters])

  const toggleSystem = useCallback((val) => setFilters(f => ({
    ...f, systems: f.systems.includes(val) ? f.systems.filter(s => s !== val) : [...f.systems, val]
  })), [])

  const toggleCategory = useCallback((val) => setFilters(f => ({
    ...f, categories: f.categories.includes(val) ? f.categories.filter(s => s !== val) : [...f.categories, val]
  })), [])

  const toggleGenre = useCallback((val) => setFilters(f => ({
    ...f, genres: f.genres.includes(val) ? f.genres.filter(s => s !== val) : [...f.genres, val]
  })), [])

  const setLanguage = useCallback((val) => setFilters(f => ({
    ...f, language: f.language === val ? null : val
  })), [])

  const setFolder = useCallback((val) => setFilters(f => ({ ...f, folder: val })), [])
  const setSort = useCallback((val) => setFilters(f => ({ ...f, sort: val })), [])

  const setReadStatus = useCallback((val) => setFilters(f => ({
    ...f, read_status: f.read_status === val ? null : val
  })), [])

  const setPlayedStatus = useCallback((val) => setFilters(f => ({
    ...f, played_status: f.played_status === val ? null : val
  })), [])

  const setSoloFriendly = useCallback((val) => setFilters(f => ({
    ...f, solo_friendly: f.solo_friendly === val ? null : val
  })), [])

  const setScoreMin = useCallback((val) => setFilters(f => ({ ...f, score_min: val })), [])
  const setScoreMax = useCallback((val) => setFilters(f => ({ ...f, score_max: val })), [])

  const toggleExcludeSystem = useCallback((val) => setFilters(f => ({
    ...f, systems_not: f.systems_not.includes(val) ? f.systems_not.filter(x => x !== val) : [...f.systems_not, val]
  })), [])
  const toggleExcludeCategory = useCallback((val) => setFilters(f => ({
    ...f, categories_not: f.categories_not.includes(val) ? f.categories_not.filter(x => x !== val) : [...f.categories_not, val]
  })), [])
  const toggleExcludeGenre = useCallback((val) => setFilters(f => ({
    ...f, genres_not: f.genres_not.includes(val) ? f.genres_not.filter(x => x !== val) : [...f.genres_not, val]
  })), [])
  const toggleExcludeTag = useCallback((val) => setFilters(f => ({
    ...f, tags_not: f.tags_not.includes(val) ? f.tags_not.filter(x => x !== val) : [...f.tags_not, val]
  })), [])

  const reset = useCallback(() => setFilters(INITIAL), [])

  const toParams = useCallback(() => ({
    systems: filters.systems,
    categories: filters.categories,
    genres: filters.genres,
    tags: filters.tags,
    systems_not: filters.systems_not,
    categories_not: filters.categories_not,
    genres_not: filters.genres_not,
    tags_not: filters.tags_not,
    language: filters.language,
    folder: filters.folder,
    sort: filters.sort,
    read_status: filters.read_status,
    played_status: filters.played_status,
    solo_friendly: filters.solo_friendly,
    score_min: filters.score_min,
    score_max: filters.score_max,
  }), [filters])

  return {
    filters,
    toggleSystem, toggleCategory, toggleGenre,
    toggleExcludeSystem, toggleExcludeCategory, toggleExcludeGenre, toggleExcludeTag,
    setLanguage, setFolder, setSort,
    setReadStatus, setPlayedStatus, setSoloFriendly, setScoreMin, setScoreMax,
    reset, toParams,
  }
}
