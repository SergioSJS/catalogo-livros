export function FilterSidebar({
  facets, filters,
  onToggleSystem, onToggleCategory, onToggleGenre, onSetLanguage, onSetFolder, onReset,
  onSetReadStatus, onSetPlayedStatus, onSetSoloFriendly, onSetScoreMin,
}) {
  const hasActiveFilters = (
    filters.systems.length > 0 || filters.categories.length > 0 ||
    filters.genres.length > 0 || filters.language || filters.folder ||
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

      <FacetGroup title="System" items={facets.systems} active={filters.systems} onToggle={onToggleSystem} />
      <FacetGroup title="Category" items={facets.categories} active={filters.categories} onToggle={onToggleCategory} />
      <FacetGroup title="Genre" items={facets.genres} active={filters.genres} onToggle={onToggleGenre} />

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

const READ_LABELS = { unread: 'Não lido', reading: 'Lendo', read: 'Lido' }
const PLAYED_LABELS = { unplayed: 'Não jogado', playing: 'Jogando', played: 'Jogado' }

function FacetGroup({ title, items, active, onToggle }) {
  if (!items?.length) return null
  return (
    <div className="sidebar-section">
      <h4 className="sidebar-heading">{title}</h4>
      {items.map(({ value, count }) => (
        <label
          key={value}
          className={`facet-item${active.includes(value) ? ' facet-active' : ''}`}
          onClick={() => onToggle(value)}
        >
          <input
            type="checkbox"
            checked={active.includes(value)}
            onChange={() => onToggle(value)}
            aria-label={value}
          />
          <span className="facet-name">{value}</span>
          <span className="facet-count">{count}</span>
        </label>
      ))}
    </div>
  )
}
