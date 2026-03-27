export function BookModal({ book, onClose }) {
  if (!book) return null

  const { title, summary, relative_path, filename, system_tags, category_tags, genre_tags, custom_tags, page_count, file_size_human, llm_confidence, llm_provider, thumbnail_url } = book

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>

        <h2 style={{ margin: '0 0 16px', fontFamily: 'serif', color: '#2d5016' }}>{title}</h2>

        {thumbnail_url && (
          <img src={thumbnail_url} alt={title} style={{ float: 'right', width: 120, marginLeft: 16, borderRadius: 8 }} />
        )}

        {summary && (
          <p style={{ color: '#444', lineHeight: 1.6, marginBottom: 16 }}>{summary}</p>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {system_tags?.map(t => <Tag key={t} label={t} color="#2d5016" />)}
          {category_tags?.map(t => <Tag key={t} label={t} color="#4a6741" />)}
          {genre_tags?.map(t => <Tag key={t} label={t} color="#c5913e" />)}
          {custom_tags?.map(t => <Tag key={t} label={t} color="#777" />)}
        </div>

        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
          <div>{relative_path || filename}</div>
          {page_count && <div>{page_count} pages</div>}
          {file_size_human && <div>{file_size_human}</div>}
          {llm_confidence && <div>Confidence: {(llm_confidence * 100).toFixed(0)}%{llm_provider ? ` (${llm_provider})` : ''}</div>}
        </div>
      </div>
    </div>
  )
}

function Tag({ label, color }) {
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: 12 }}>{label}</span>
  )
}
