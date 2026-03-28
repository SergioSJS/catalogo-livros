import { useState } from 'react'
import { patchPersonalFields } from '../api/client.js'

const LANG_LABEL = { en: 'English', pt: 'Português' }
const READ_LABELS = { unread: 'Não lido', reading: 'Lendo', read: 'Lido' }
const PLAYED_LABELS = { unplayed: 'Não jogado', playing: 'Jogando', played: 'Jogado' }

function stripMarkdown(text) {
  if (!text) return text
  return text
    .replace(/^#+\s+.+\n?/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim()
}

export function BookModal({ book, onClose, onUpdate }) {
  const [personal, setPersonal] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!book) return null

  const {
    file_hash, title, summary, relative_path, filename, language, parent_folder,
    system_tags, category_tags, genre_tags, custom_tags,
    page_count, file_size_human, llm_confidence, llm_provider, thumbnail_url,
  } = book

  const cur = personal ?? {
    read_status: book.read_status ?? 'unread',
    played_status: book.played_status ?? 'unplayed',
    solo_friendly: book.solo_friendly ?? false,
    review: book.review ?? '',
    score: book.score ?? null,
  }

  function updateField(field, value) {
    setPersonal(p => ({ ...(p ?? cur), [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await patchPersonalFields(file_hash, {
        read_status: cur.read_status,
        played_status: cur.played_status,
        solo_friendly: cur.solo_friendly,
        review: cur.review || null,
        score: cur.score,
      })
      setPersonal(null)
      onUpdate?.(updated)
    } finally {
      setSaving(false)
    }
  }

  const isDirty = personal !== null

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

          {/* Personal fields editor */}
          <div className="personal-editor">
            <div className="personal-row">
              <span className="personal-label">Leitura</span>
              <div className="btn-group">
                {Object.entries(READ_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    className={`status-btn${cur.read_status === val ? ' status-active' : ''}`}
                    onClick={() => updateField('read_status', val)}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div className="personal-row">
              <span className="personal-label">Jogado</span>
              <div className="btn-group">
                {Object.entries(PLAYED_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    className={`status-btn${cur.played_status === val ? ' status-active' : ''}`}
                    onClick={() => updateField('played_status', val)}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div className="personal-row">
              <span className="personal-label">Solo friendly</span>
              <label className="toggle-wrap">
                <input
                  type="checkbox"
                  checked={cur.solo_friendly}
                  onChange={e => updateField('solo_friendly', e.target.checked)}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

            <div className="personal-row">
              <span className="personal-label">Score</span>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`star-btn${cur.score != null && n <= cur.score ? ' star-active' : ''}`}
                    onClick={() => updateField('score', cur.score === n ? null : n)}
                    aria-label={`${n} estrelas`}
                  >★</button>
                ))}
              </div>
            </div>

            <div className="personal-row personal-review-row">
              <span className="personal-label">Review</span>
              <textarea
                className="review-input"
                placeholder="Suas notas sobre este livro..."
                value={cur.review}
                onChange={e => updateField('review', e.target.value)}
                rows={3}
              />
            </div>

            {isDirty && (
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
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
