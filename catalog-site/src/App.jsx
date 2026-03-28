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

  const { filters, toggleSystem, toggleCategory, toggleGenre, setLanguage, setFolder, setSort, reset, toParams } = useFilters()
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
    onReset: () => { reset(); setPage(1) },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      {/* Header */}
      <header style={{ background: '#2d5016', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>
        <h1 style={{ margin: 0, fontFamily: 'Cinzel, Georgia, serif', fontSize: 18, whiteSpace: 'nowrap', letterSpacing: 1 }}>
          📚 RPG Catalog
        </h1>

        {/* Filter toggle — mobile only */}
        <button className="filter-toggle-btn" onClick={() => setDrawerOpen(true)}>
          ☰ Filters
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <SearchBar value={inputValue} onChange={handleSearch} onClear={() => { clear(); setPage(1) }} />
        </div>
        <div style={{ flexShrink: 0 }}>
          <IndexingPanel indexer={indexer} onStart={() => indexer.startIndex()} />
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200 }} onClick={() => setDrawerOpen(false)}>
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 300, background: '#fff', padding: '16px', overflowY: 'auto', boxShadow: '4px 0 24px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Filters</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            <FilterSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      <div className="layout-body">
        {/* Sidebar desktop */}
        <div className="sidebar-col">
          <FilterSidebar {...sidebarProps} />
        </div>

        {/* Main */}
        <main className="main-col">
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#888' }}>
              {pagination ? `${pagination.total_items} books found` : '…'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#666' }}>Sort:</label>
              <select
                value={filters.sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
                style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
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

      <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </div>
  )
}
