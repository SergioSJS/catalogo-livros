const LANG_LABEL = { en: 'English', pt: 'Português' }

function stripMarkdown(text) {
  if (!text) return text
  return text
    .replace(/^#+\s+.+\n?/gm, '')   // remove headings like "# Summary"
    .replace(/\*\*(.+?)\*\*/g, '$1') // remove bold
    .replace(/\*(.+?)\*/g, '$1')     // remove italic
    .trim()
}

export function BookModal({ book, onClose }) {
  if (!book) return null

  const { file_hash, title, summary, relative_path, filename, language, parent_folder,
    system_tags, category_tags, genre_tags, custom_tags,
    page_count, file_size_human, llm_confidence, llm_provider, thumbnail_url } = book

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 620, width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1, color: '#666' }}
        >×</button>

        {/* Header row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          {thumbnail_url && (
            <img src={thumbnail_url} alt={title} style={{ width: 100, flexShrink: 0, borderRadius: 8, objectFit: 'cover', alignSelf: 'flex-start' }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 8px', fontFamily: 'serif', color: '#2d5016', lineHeight: 1.3 }}>{title}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {language && (
                <span style={{ background: '#2d5016', color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                  {LANG_LABEL[language] ?? language.toUpperCase()}
                </span>
              )}
              {parent_folder && (
                <span style={{ background: '#f0f0ec', color: '#555', borderRadius: 4, padding: '3px 8px', fontSize: 12 }}>{parent_folder}</span>
              )}
              {system_tags?.map(t => <Tag key={t} label={t} color="#4a6741" />)}
              {category_tags?.map(t => <Tag key={t} label={t} color="#6b7c3e" />)}
              {genre_tags?.map(t => <Tag key={t} label={t} color="#c5913e" />)}
              {custom_tags?.map(t => <Tag key={t} label={t} color="#999" />)}
            </div>
          </div>
        </div>

        {summary && (
          <p style={{ color: '#444', lineHeight: 1.7, marginBottom: 16, fontSize: 14 }}>{stripMarkdown(summary)}</p>
        )}

        {/* Meta */}
        <div style={{ fontSize: 13, color: '#666', lineHeight: 2, borderTop: '1px solid #f0f0ec', paddingTop: 12, marginBottom: 16 }}>
          {relative_path && <div><strong>Path:</strong> {relative_path}</div>}
          {page_count && <div><strong>Pages:</strong> {page_count}</div>}
          {file_size_human && <div><strong>Size:</strong> {file_size_human}</div>}
          {llm_confidence && (
            <div><strong>AI confidence:</strong> {(llm_confidence * 100).toFixed(0)}%{llm_provider ? ` via ${llm_provider}` : ''}</div>
          )}
        </div>

        {/* Download */}
        <a
          href={`/api/books/${file_hash}/download`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', background: '#2d5016', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          ⬇ Download PDF
        </a>
      </div>
    </div>
  )
}

function Tag({ label, color }) {
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: 12 }}>{label}</span>
  )
}
