import { BookCard } from './BookCard.jsx'

function SkeletonCard() {
  return <div role="status" aria-label="Loading" className="skeleton" style={{ height: 280 }} />
}

export function BookGrid({ books, loading, onSelect }) {
  if (loading) {
    return (
      <div className="book-grid">
        {Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!books.length) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
        No books found matching your filters.
      </div>
    )
  }

  return (
    <div className="book-grid">
      {books.map((book, idx) => (
        <BookCard key={book.file_hash} book={book} onSelect={b => onSelect(b, idx)} />
      ))}
    </div>
  )
}
