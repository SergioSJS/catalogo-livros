export function FilterSidebar({ facets, filters, onToggleSystem, onToggleCategory, onToggleGenre, onSetLanguage, onSetFolder, onReset }) {
  const hasActiveFilters = filters.systems.length > 0 || filters.categories.length > 0 || filters.genres.length > 0 || filters.language || filters.folder

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
    </aside>
  )
}

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
