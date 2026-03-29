export function Pagination({ page, totalPages, onPage }) {
  return (
    <nav className="pagination" aria-label="Page navigation">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="page-btn"
      >
        Prev
      </button>
      <span className="page-info">Page {page} of {totalPages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="page-btn"
      >
        Next
      </button>
    </nav>
  )
}
