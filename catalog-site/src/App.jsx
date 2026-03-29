import { useState, useEffect } from 'react'
import { useFilters } from './hooks/useFilters.js'
import { useSearch } from './hooks/useSearch.js'
import { useBooks } from './hooks/useBooks.js'
import { useFacets } from './hooks/useFacets.js'
import { useIndexer } from './hooks/useIndexer.js'
import { BookGrid } from './components/BookGrid.jsx'
import { BookModal } from './components/BookModal.jsx'
import { FilterSidebar } from './components/FilterSidebar.jsx'
import { SearchBar } from './components/SearchBar.jsx'
import { Pagination } from './components/Pagination.jsx'
import { IndexingPanel } from './components/IndexingPanel.jsx'

const SORT_OPTIONS = [
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
  { value: 'pages_desc', label: 'Most pages' },
  { value: 'pages_asc', label: 'Fewest pages' },
  { value: 'size_desc', label: 'Largest file' },
  { value: 'newest', label: 'Recently indexed' },
]

export default function App() {
  const [page, setPage] = useState(() => {
    try { return parseInt(localStorage.getItem('rpg_page') ?? '1', 10) || 1 } catch { return 1 }
  })
  const [selectedBook, setSelectedBook] = useState(null)
  const [selectedBookIndex, setSelectedBookIndex] = useState(null)
  const [bookUpdates, setBookUpdates] = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { filters, toggleSystem, toggleCategory, toggleGenre, toggleExcludeSystem, toggleExcludeCategory, toggleExcludeGenre, setLanguage, setFolder, setSort, setReadStatus, setPlayedStatus, setSoloFriendly, setScoreMin, reset, toParams } = useFilters()
  const { inputValue, q, setInput, clear } = useSearch()
  const indexer = useIndexer()

  const queryParams = { ...toParams(), q, page }
  const { items, pagination, loading } = useBooks(queryParams)
  const { facets } = useFacets({
    language: filters.language,
    systems: filters.systems,
    categories: filters.categories,
    genres: filters.genres,
    folder: filters.folder,
  })

  useEffect(() => {
    try { localStorage.setItem('rpg_page', String(page)) } catch {}
  }, [page])

  function handleSearch(val) { setInput(val); setPage(1) }
  function handleFilterChange(fn) {
    return (...args) => { fn(...args); setPage(1) }
  }

  const sidebarProps = {
    facets,
    filters,
    onToggleSystem: handleFilterChange(toggleSystem),
    onToggleCategory: handleFilterChange(toggleCategory),
    onToggleGenre: handleFilterChange(toggleGenre),
    onToggleSystemExclude: handleFilterChange(toggleExcludeSystem),
    onToggleCategoryExclude: handleFilterChange(toggleExcludeCategory),
    onToggleGenreExclude: handleFilterChange(toggleExcludeGenre),
    onSetLanguage: handleFilterChange(setLanguage),
    onSetFolder: handleFilterChange(setFolder),
    onSetReadStatus: handleFilterChange(setReadStatus),
    onSetPlayedStatus: handleFilterChange(setPlayedStatus),
    onSetSoloFriendly: handleFilterChange(setSoloFriendly),
    onSetScoreMin: handleFilterChange(setScoreMin),
    onReset: () => { reset(); setPage(1) },
  }

  return (
    <>
      <header className="site-header">
        <div className="header-row1">
          <span className="header-logo">📚 RPG Catalog</span>
          <div className="header-search-wrap">
            <SearchBar value={inputValue} onChange={handleSearch} onClear={() => { clear(); setPage(1) }} />
          </div>
          <button className="filter-toggle" onClick={() => setDrawerOpen(true)}>
            ☰ Filters
          </button>
          <IndexingPanel indexer={indexer} onStart={() => indexer.startIndex()} />
        </div>
        <div className="header-row2">
          <SearchBar value={inputValue} onChange={handleSearch} onClear={() => { clear(); setPage(1) }} />
        </div>
      </header>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Filters</span>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>×</button>
            </div>
            <div className="drawer-body">
              <FilterSidebar {...sidebarProps} />
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <FilterSidebar {...sidebarProps} />
        </aside>

        <main className="main">
          <div className="toolbar">
            <span className="toolbar-count">
              {pagination ? `${pagination.total_items} books` : '…'}
            </span>
            <div className="sort-wrap">
              <label className="sort-label">Sort:</label>
              <select
                value={filters.sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
                className="sort-select"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <Pagination page={page} totalPages={pagination.total_pages} onPage={setPage} />
          )}

          <BookGrid books={items} loading={loading} onSelect={(b, idx) => {
            setSelectedBook(bookUpdates[b.file_hash] ?? b)
            setSelectedBookIndex(idx)
          }} />

          {pagination && pagination.total_pages > 1 && (
            <Pagination page={page} totalPages={pagination.total_pages} onPage={setPage} />
          )}
        </main>
      </div>

      <BookModal
        book={selectedBook}
        books={items}
        bookIndex={selectedBookIndex}
        hasNextPage={pagination ? page < pagination.total_pages : false}
        hasPrevPage={page > 1}
        onNavigate={(target) => {
          if (target === 'next-page') {
            setPage(p => p + 1)
            setSelectedBook(null)
            setSelectedBookIndex(null)
          } else if (target === 'prev-page') {
            setPage(p => p - 1)
            setSelectedBook(null)
            setSelectedBookIndex(null)
          } else {
            const b = items[target]
            setSelectedBook(bookUpdates[b.file_hash] ?? b)
            setSelectedBookIndex(target)
          }
        }}
        onClose={() => { setSelectedBook(null); setSelectedBookIndex(null) }}
        onUpdate={(updated) => {
          setSelectedBook(updated)
          setBookUpdates(prev => ({ ...prev, [updated.file_hash]: updated }))
        }}
      />
    </>
  )
}
