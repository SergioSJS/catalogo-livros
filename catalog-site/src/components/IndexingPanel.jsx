export function IndexingPanel({ indexer, onStart }) {
  const { isIndexing, progress, error } = indexer
  const total = progress?.total_files ?? 0
  const processed = progress?.processed ?? 0
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e5e5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onStart}
          disabled={isIndexing}
          aria-label="Reindex library"
          style={{ padding: '6px 14px', borderRadius: 6, background: isIndexing ? '#bbb' : '#2d5016', color: '#fff', border: 'none', cursor: isIndexing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          Reindex
        </button>
        {isIndexing && progress?.phase && (
          <span style={{ fontSize: 13, color: '#555' }}>{progress.phase}…</span>
        )}
      </div>

      {isIndexing && (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ marginTop: 10, height: 6, background: '#e5e5e5', borderRadius: 3, overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: '#2d5016', transition: 'width .3s ease' }} />
        </div>
      )}

      {error && (
        <p style={{ color: '#c00', fontSize: 13, margin: '8px 0 0' }}>{error.message}</p>
      )}
    </div>
  )
}
