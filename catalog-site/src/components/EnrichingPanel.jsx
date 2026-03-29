export function EnrichingPanel({ enricher, onStart }) {
  const { isEnriching, progress, error, failedCount, startEnrichRetry } = enricher
  const total = progress?.total ?? 0
  const processed = progress?.processed ?? 0
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div className="index-wrap">
      <button
        onClick={onStart}
        disabled={isEnriching}
        aria-label="Enriquecer com IA"
        className="index-btn"
        title="Enriquecer livros sem tags com IA"
      >
        {isEnriching ? 'IA…' : '✦ IA'}
      </button>
      {!isEnriching && failedCount > 0 && (
        <button
          onClick={startEnrichRetry}
          className="index-btn"
          aria-label={`Retry ${failedCount} failed`}
          title={`Retry ${failedCount} books that failed LLM enrichment`}
        >
          🔁 {failedCount}
        </button>
      )}
      {isEnriching && (
        <>
          {progress?.current_file && (
            <span className="index-phase" title={progress.current_file}>
              {progress.processed ?? 0}/{total}
            </span>
          )}
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
