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
      className="modal-overlay"
      onClick={onClose}
    >
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="modal-close">×</button>
        <div className="modal-inner">
          <div className="modal-header">
            {thumbnail_url && (
              <img src={thumbnail_url} alt={title} className="modal-thumb" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="modal-title">{title}</h2>
              <div className="modal-badges">
                {language && <span className="badge-lang">{LANG_LABEL[language] ?? language.toUpperCase()}</span>}
                {parent_folder && <span className="badge-folder">{parent_folder}</span>}
                {system_tags?.map(t => <Tag key={t} label={t} color="#4a6741" />)}
                {category_tags?.map(t => <Tag key={t} label={t} color="#6b7c3e" />)}
                {genre_tags?.map(t => <Tag key={t} label={t} color="#c5913e" />)}
                {custom_tags?.map(t => <Tag key={t} label={t} color="#999" />)}
              </div>
            </div>
          </div>

          {summary && (
            <p className="modal-summary">{stripMarkdown(summary)}</p>
          )}

          <div className="modal-meta">
            {relative_path && <div><strong>Path:</strong> {relative_path}</div>}
            {page_count && <div><strong>Pages:</strong> {page_count}</div>}
            {file_size_human && <div><strong>Size:</strong> {file_size_human}</div>}
            {llm_confidence && (
              <div><strong>AI confidence:</strong> {(llm_confidence * 100).toFixed(0)}%{llm_provider ? ` via ${llm_provider}` : ''}</div>
            )}
          </div>

          <a
            href={`/api/books/${file_hash}/download`}
            target="_blank"
            rel="noreferrer"
            className="modal-dl-btn"
          >
            ⬇ Download PDF
          </a>
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
