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

export default function App() {
  const [page, setPage] = useState(1)
  const [selectedBook, setSelectedBook] = useState(null)

  const { filters, toggleSystem, toggleCategory, toggleGenre, setLanguage, setFolder, setSort, reset, toParams } = useFilters()
  const { inputValue, q, setInput, clear } = useSearch()
  const indexer = useIndexer()

  const queryParams = { ...toParams(), q, page }
  const { items, pagination, loading } = useBooks(queryParams)
  const { facets } = useFacets({ language: filters.language })

  function handleSearch(val) {
    setInput(val)
    setPage(1)
  }

  function handleFilterChange(fn) {
    return (...args) => { fn(...args); setPage(1) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#2d5016', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 20, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          📚 RPG Catalog
        </h1>
        <div style={{ flex: 1, maxWidth: 480 }}>
          <SearchBar value={inputValue} onChange={handleSearch} onClear={() => { clear(); setPage(1) }} />
        </div>
        <div style={{ flexShrink: 0 }}>
          <IndexingPanel indexer={indexer} onStart={() => indexer.startIndex()} />
        </div>
      </header>

      <div style={{ display: 'flex', gap: 24, padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {/* Sidebar */}
        <div style={{ flexShrink: 0, width: 240 }}>
          <FilterSidebar
            facets={facets}
            filters={filters}
            onToggleSystem={handleFilterChange(toggleSystem)}
            onToggleCategory={handleFilterChange(toggleCategory)}
            onToggleGenre={handleFilterChange(toggleGenre)}
            onSetLanguage={handleFilterChange(setLanguage)}
            onSetFolder={handleFilterChange(setFolder)}
            onReset={() => { reset(); setPage(1) }}
          />
        </div>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {pagination && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>
              {pagination.total_items} books found
            </p>
          )}

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
