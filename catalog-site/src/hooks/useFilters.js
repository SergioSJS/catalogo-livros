import { useState, useCallback } from 'react'

const INITIAL = { systems: [], categories: [], genres: [], tags: [], language: null, folder: null, sort: 'title_asc' }

export function useFilters() {
  const [filters, setFilters] = useState(INITIAL)

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
  const reset = useCallback(() => setFilters(INITIAL), [])

  const toParams = useCallback(() => ({
    systems: filters.systems,
    categories: filters.categories,
    genres: filters.genres,
    tags: filters.tags,
    language: filters.language,
    folder: filters.folder,
    sort: filters.sort,
  }), [filters])

  return { filters, toggleSystem, toggleCategory, toggleGenre, setLanguage, setFolder, setSort, reset, toParams }
}
