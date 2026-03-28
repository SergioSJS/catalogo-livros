export function IndexingPanel({ indexer, onStart }) {
  const { isIndexing, progress, error } = indexer
  const total = progress?.total_files ?? 0
  const processed = progress?.processed ?? 0
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div className="index-wrap">
      <button
        onClick={onStart}
        disabled={isIndexing}
        aria-label="Reindex library"
        className="index-btn"
      >
        {isIndexing ? 'Indexing…' : 'Reindex'}
      </button>
      {isIndexing && (
        <>
          {progress?.phase && <span className="index-phase">{progress.phase}</span>}
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="index-bar-track"
          >
            <div className="index-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      {error && <span className="index-phase" style={{ color: '#f88' }}>{error.message}</span>}
    </div>
  )
}
