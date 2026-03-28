import { useState } from 'react'
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
  const [page, setPage] = useState(1)
  const [selectedBook, setSelectedBook] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { filters, toggleSystem, toggleCategory, toggleGenre, setLanguage, setFolder, setSort, setReadStatus, setPlayedStatus, setSoloFriendly, setScoreMin, reset, toParams } = useFilters()
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

          <BookGrid books={items} loading={loading} onSelect={setSelectedBook} />

          {pagination && pagination.total_pages > 1 && (
            <Pagination page={page} totalPages={pagination.total_pages} onPage={setPage} />
          )}
        </main>
      </div>

      <BookModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onUpdate={(updated) => setSelectedBook(updated)}
      />
    </>
  )
}
