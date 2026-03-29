export function FilterSidebar({
  facets, filters,
  onToggleSystem, onToggleCategory, onToggleGenre,
  onToggleSystemExclude, onToggleCategoryExclude, onToggleGenreExclude,
  onSetLanguage, onSetFolder, onReset,
  onSetReadStatus, onSetPlayedStatus, onSetSoloFriendly, onSetScoreMin,
}) {
  const hasActiveFilters = (
    filters.systems.length > 0 || filters.categories.length > 0 ||
    filters.genres.length > 0 || filters.language || filters.folder ||
    filters.systems_not?.length > 0 || filters.categories_not?.length > 0 || filters.genres_not?.length > 0 ||
    filters.read_status || filters.played_status || filters.solo_friendly != null || filters.score_min != null
  )

  return (
    <aside>
      <div className="sidebar-header">
        <span className="sidebar-title">Filters</span>
        {hasActiveFilters && (
          <button onClick={onReset} aria-label="Reset filters" className="sidebar-reset">Reset</button>
        )}
      </div>

      {/* Language */}
      {facets.languages?.length > 0 && (
        <div className="sidebar-section">
          <h4 className="sidebar-heading">Language</h4>
          {facets.languages.map(({ value, label, count }) => (
            <label key={value} className={`facet-item${filters.language === value ? ' facet-active' : ''}`}>
              <input
                type="radio"
                name="language"
                checked={filters.language === value}
                onChange={() => onSetLanguage(value)}
                aria-label={label}
              />
              <span className="facet-name">{label}</span>
              <span className="facet-count">{count}</span>
            </label>
          ))}
        </div>
      )}

      <FacetGroup title="System" items={facets.systems} active={filters.systems} excluded={filters.systems_not} onToggle={onToggleSystem} onExclude={onToggleSystemExclude} />
      <FacetGroup title="Category" items={facets.categories} active={filters.categories} excluded={filters.categories_not} onToggle={onToggleCategory} onExclude={onToggleCategoryExclude} />
      <FacetGroup title="Genre" items={facets.genres} active={filters.genres} excluded={filters.genres_not} onToggle={onToggleGenre} onExclude={onToggleGenreExclude} />

      {/* Folder */}
      {facets.folders?.length > 0 && (
        <div className="sidebar-section">
          <h4 className="sidebar-heading">Folder</h4>
          {facets.folders.slice(0, 20).map(({ value, count }) => (
            <label key={value} className={`facet-item${filters.folder === value ? ' facet-active' : ''}`}>
              <input
                type="radio"
                name="folder"
                checked={filters.folder === value}
                onChange={() => onSetFolder(value)}
                aria-label={value}
              />
              <span className="facet-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              <span className="facet-count" style={{ flexShrink: 0 }}>{count}</span>
            </label>
          ))}
        </div>
      )}

      {/* Personal filters */}
      <div className="sidebar-section">
        <h4 className="sidebar-heading">Leitura</h4>
        {['unread', 'reading', 'read'].map(s => (
          <label key={s} className={`facet-item${filters.read_status === s ? ' facet-active' : ''}`}>
            <input
              type="radio"
              name="read_status"
              checked={filters.read_status === s}
              onChange={() => onSetReadStatus(s)}
              aria-label={READ_LABELS[s]}
            />
            <span className="facet-name">{READ_LABELS[s]}</span>
          </label>
        ))}
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-heading">Jogado</h4>
        {['unplayed', 'playing', 'played'].map(s => (
          <label key={s} className={`facet-item${filters.played_status === s ? ' facet-active' : ''}`}>
            <input
              type="radio"
              name="played_status"
              checked={filters.played_status === s}
              onChange={() => onSetPlayedStatus(s)}
              aria-label={PLAYED_LABELS[s]}
            />
            <span className="facet-name">{PLAYED_LABELS[s]}</span>
          </label>
        ))}
      </div>

      <div className="sidebar-section">
        <label className={`facet-item${filters.solo_friendly ? ' facet-active' : ''}`}>
          <input
            type="checkbox"
            checked={!!filters.solo_friendly}
            onChange={e => onSetSoloFriendly(e.target.checked ? true : null)}
            aria-label="Solo friendly"
          />
          <span className="facet-name">Solo friendly</span>
        </label>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-heading">Score mínimo</h4>
        <div className="score-filter">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={`star-btn${filters.score_min != null && n <= filters.score_min ? ' star-active' : ''}`}
              onClick={() => onSetScoreMin(filters.score_min === n ? null : n)}
              aria-label={`${n} estrelas`}
            >★</button>
          ))}
        </div>
      </div>
    </aside>
  )
}

import { useState } from 'react'

const READ_LABELS = { unread: 'Não lido', reading: 'Lendo', read: 'Lido' }
const PLAYED_LABELS = { unplayed: 'Não jogado', playing: 'Jogando', played: 'Jogado' }

function FacetGroup({ title, items, active, excluded = [], onToggle, onExclude }) {
  const hasActive = active.some(a => items?.some(i => i.value === a))
  const hasExcluded = excluded.some(e => items?.some(i => i.value === e))
  const [open, setOpen] = useState(hasActive || hasExcluded)

  if (!items?.length) return null

  function handleChange(value) {
    const isActive = active.includes(value)
    const isExcluded = excluded.includes(value)
    if (isExcluded) {
      // excluded → none
      onExclude?.(value)
    } else if (isActive) {
      // included → excluded
      onToggle(value)
      onExclude?.(value)
    } else {
      // none → included
      onToggle(value)
    }
  }

  return (
    <div className="sidebar-section">
      <button
        className="sidebar-heading sidebar-heading-btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={title}
      >
        {title}
        <span className="sidebar-heading-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && items.map(({ value, count }) => {
        const isActive = active.includes(value)
        const isExcluded = excluded.includes(value)
        const stateClass = isActive ? ' facet-active' : isExcluded ? ' facet-excluded' : ''
        return (
          <label
            key={value}
            className={`facet-item${stateClass}`}
          >
            <input
              type="checkbox"
              checked={isActive || isExcluded}
              onChange={() => handleChange(value)}
              aria-label={value}
            />
            <span className="facet-name">{value}</span>
            {isExcluded && <span className="facet-exclude-icon">✕</span>}
            <span className="facet-count">{count}</span>
          </label>
        )
      })}
    </div>
  )
}
