import { BookCard } from './BookCard.jsx'

function SkeletonCard() {
  return (
    <div role="status" aria-label="Loading" style={{ background: '#f0f0f0', borderRadius: 12, height: 280, animation: 'pulse 1.5s ease-in-out infinite' }} />
  )
}

export function BookGrid({ books, loading, onSelect }) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
      {books.map(book => (
        <BookCard key={book.file_hash} book={book} onSelect={onSelect} />
      ))}
    </div>
  )
}
