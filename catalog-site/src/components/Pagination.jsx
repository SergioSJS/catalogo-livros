export function Pagination({ page, totalPages, onPage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', padding: '16px 0' }}>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: page <= 1 ? '#f5f5f5' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
      >
        Prev
      </button>
      <span style={{ fontSize: 14, color: '#555' }}>
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: page >= totalPages ? '#f5f5f5' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
      >
        Next
      </button>
    </div>
  )
}
