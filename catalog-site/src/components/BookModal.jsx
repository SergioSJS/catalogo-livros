import { useState, useEffect, useRef } from 'react'
import { patchPersonalFields, patchBookMetadata } from '../api/client.js'
import { useSwipe } from '../hooks/useSwipe.js'

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

function formatPath(relative_path, parent_folder, language) {
  if (!relative_path) return null
  // Break path into breadcrumb-like parts
  const parts = relative_path.split(/[/\\]/).filter(Boolean)
  // Remove filename (last part) from display since it's the book title
  const dirs = parts.slice(0, -1)
  if (dirs.length === 0) return relative_path
  return dirs.join(' › ')
}

export function BookModal({ book, books, bookIndex, onNavigate, hasNextPage, hasPrevPage, onClose, onUpdate, onRandom, onEnrich, enriching }) {
  const [personal, setPersonal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [editingMeta, setEditingMeta] = useState(false)
  const [meta, setMeta] = useState(null)
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaError, setMetaError] = useState(null)
  const boxRef = useRef(null)

  // Reset all state when book changes
  useEffect(() => {
    setPersonal(null)
    setSaveError(null)
    setEditingMeta(false)
    setMeta(null)
    setMetaError(null)
  }, [book?.file_hash])

  const hasBooks = books != null && bookIndex != null
  const canGoPrev = hasBooks && (bookIndex > 0 || hasPrevPage)
  const canGoNext = hasBooks && (bookIndex < books.length - 1 || hasNextPage)

  function handlePrev() {
    if (!canGoPrev) return
    if (bookIndex > 0) onNavigate(bookIndex - 1)
    else onNavigate('prev-page')
  }

  function handleNext() {
    if (!canGoNext) return
    if (bookIndex < books.length - 1) onNavigate(bookIndex + 1)
    else onNavigate('next-page')
  }

  // Swipe gestures on the modal box (mobile)
  useSwipe(boxRef, {
    onSwipeLeft: () => handleNext(),
    onSwipeRight: () => handlePrev(),
  })

  // Global keyboard handler — works regardless of what's focused inside
  useEffect(() => {
    if (!book) return
    function onKey(e) {
      // Don't intercept when typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [book, canGoNext, canGoPrev, bookIndex, books]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!book) return null

  const {
    file_hash, title, summary, relative_path, filename, language, parent_folder,
    system_tags, category_tags, genre_tags, custom_tags,
    page_count, file_size_human, llm_confidence, llm_provider, thumbnail_url, llm_error,
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
    setSaveError(null)
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
    } catch (err) {
      setSaveError(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const isDirty = personal !== null

  // Metadata editor helpers
  const curMeta = meta ?? {
    title: book.title ?? '',
    summary: book.summary ?? '',
    system_tags: [...(book.system_tags ?? [])],
    category_tags: [...(book.category_tags ?? [])],
    genre_tags: [...(book.genre_tags ?? [])],
    custom_tags: [...(book.custom_tags ?? [])],
  }

  function openMetaEditor() {
    setMeta({
      title: book.title ?? '',
      summary: book.summary ?? '',
      system_tags: [...(book.system_tags ?? [])],
      category_tags: [...(book.category_tags ?? [])],
      genre_tags: [...(book.genre_tags ?? [])],
      custom_tags: [...(book.custom_tags ?? [])],
    })
    setEditingMeta(true)
    setMetaError(null)
  }

  function updateMeta(field, value) {
    setMeta(m => ({ ...m, [field]: value }))
  }

  function removeTag(field, tag) {
    setMeta(m => ({ ...m, [field]: m[field].filter(t => t !== tag) }))
  }

  function addTag(field, tag) {
    const trimmed = tag.trim()
    if (!trimmed) return
    setMeta(m => ({ ...m, [field]: m[field].includes(trimmed) ? m[field] : [...m[field], trimmed] }))
  }

  async function handleMetaSave() {
    setMetaSaving(true)
    setMetaError(null)
    try {
      const updated = await patchBookMetadata(file_hash, curMeta)
      setEditingMeta(false)
      setMeta(null)
      onUpdate?.(updated)
    } catch (err) {
      setMetaError(`Erro ao salvar: ${err.message}`)
    } finally {
      setMetaSaving(false)
    }
  }

  const pathDisplay = formatPath(relative_path, parent_folder, language)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-overlay"
      onClick={onClose}
    >
      <div className="modal-box" ref={boxRef} onClick={e => e.stopPropagation()}>
        {/* Fixed top bar: nav + actions */}
        <div className="modal-top-bar">
          {hasBooks && (
            <button className="modal-nav-arrow" onClick={handlePrev} disabled={!canGoPrev} aria-label="Livro anterior">‹</button>
          )}
          <span className="modal-nav-pos">
            {hasBooks ? `${bookIndex + 1} / ${books.length}` : ''}
          </span>
          {hasBooks && (
            <button className="modal-nav-arrow" onClick={handleNext} disabled={!canGoNext} aria-label="Próximo livro">›</button>
          )}
          <div style={{ flex: 1 }} />
          {onRandom && (
            <button className="modal-action-btn" onClick={onRandom} aria-label="Livro aleatório" title="Livro aleatório">🎲</button>
          )}
          {!editingMeta && (
            <button className="modal-action-btn" onClick={openMetaEditor} aria-label="Editar metadados" title="Editar metadados">✎</button>
          )}
          {onEnrich && (
            <button
              className="modal-action-btn"
              onClick={() => onEnrich(file_hash)}
              disabled={enriching}
              aria-label="Enriquecer com IA"
              title="Solicitar enriquecimento por IA"
            >✦</button>
          )}
          <button onClick={onClose} aria-label="Fechar" className="modal-action-btn modal-close">×</button>
        </div>

        <div className="modal-inner">
          <div className="modal-header">
            {thumbnail_url && (
              <img src={thumbnail_url} alt={title} className="modal-thumb" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="modal-title">{title}</h2>
              <div className="modal-badges">
                {language && <span className="badge-lang">{LANG_LABEL[language] ?? language.toUpperCase()}</span>}
                {system_tags?.map(t => <span key={t} className="tag-pill tag-system">{t}</span>)}
                {category_tags?.map(t => <span key={t} className="tag-pill tag-category">{t}</span>)}
                {genre_tags?.map(t => <span key={t} className="tag-pill tag-genre">{t}</span>)}
                {custom_tags?.map(t => <span key={t} className="tag-pill tag-custom">{t}</span>)}
              </div>
            </div>
          </div>

          {summary && !editingMeta && (
            <p className="modal-summary">{stripMarkdown(summary)}</p>
          )}

          {editingMeta && (
            <div className="meta-editor">
              <div className="meta-field">
                <label className="meta-label" htmlFor="meta-title">Título</label>
                <input
                  id="meta-title"
                  aria-label="Título"
                  className="meta-input"
                  value={curMeta.title}
                  onChange={e => updateMeta('title', e.target.value)}
                />
              </div>

              <div className="meta-field">
                <label className="meta-label" htmlFor="meta-summary">Resumo</label>
                <textarea
                  id="meta-summary"
                  aria-label="Resumo"
                  className="meta-textarea"
                  value={curMeta.summary}
                  onChange={e => updateMeta('summary', e.target.value)}
                  rows={4}
                />
              </div>

              <TagChipEditor label="Sistemas" field="system_tags" tags={curMeta.system_tags} onRemove={removeTag} onAdd={addTag} />
              <TagChipEditor label="Categorias" field="category_tags" tags={curMeta.category_tags} onRemove={removeTag} onAdd={addTag} />
              <TagChipEditor label="Gêneros" field="genre_tags" tags={curMeta.genre_tags} onRemove={removeTag} onAdd={addTag} />
              <TagChipEditor label="Tags" field="custom_tags" tags={curMeta.custom_tags} onRemove={removeTag} onAdd={addTag} />

              {metaError && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{metaError}</p>}

              <div className="meta-actions">
                <button className="save-btn" onClick={handleMetaSave} disabled={metaSaving} aria-label="Salvar metadados">
                  {metaSaving ? 'Salvando…' : 'Salvar metadados'}
                </button>
                <button className="cancel-btn" onClick={() => { setEditingMeta(false); setMeta(null) }} aria-label="Cancelar">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="modal-meta">
            {pathDisplay && (
              <div className="modal-path">
                <span className="modal-path-label">Pasta</span>
                <span className="modal-path-value">{pathDisplay}</span>
              </div>
            )}
            {page_count && <div><strong>Páginas:</strong> {page_count}</div>}
            {file_size_human && <div><strong>Tamanho:</strong> {file_size_human}</div>}
            {llm_confidence && (
              <div><strong>IA:</strong> {(llm_confidence * 100).toFixed(0)}% confiança{llm_provider ? ` · ${llm_provider}` : ''}</div>
            )}
            {llm_error && (
              <div style={{ color: '#c0392b', fontSize: 13 }}><strong>Erro IA:</strong> {llm_error}</div>
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
                  aria-label="Solo friendly"
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

            {saveError && (
              <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{saveError}</p>
            )}
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

function TagChipEditor({ label, field, tags, onRemove, onAdd }) {
  const [input, setInput] = useState('')
  const singular = label.replace(/s$/, '').toLowerCase()

  function handleAdd() {
    if (!input.trim()) return
    onAdd(field, input)
    setInput('')
  }

  return (
    <div className="meta-field">
      <span className="meta-label">{label}</span>
      <div className="chip-list">
        {tags.map(t => (
          <span key={t} className="chip">
            {t}
            <button
              className="chip-remove"
              onClick={() => onRemove(field, t)}
              aria-label={`Remover ${t}`}
            >×</button>
          </span>
        ))}
      </div>
      <div className="chip-input-row">
        <input
          className="chip-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Adicionar ${singular}…`}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          className="chip-add-btn"
          onClick={handleAdd}
          aria-label={`Adicionar ${singular}`}
        >+</button>
      </div>
    </div>
  )
}
