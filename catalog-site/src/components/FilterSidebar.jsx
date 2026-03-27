export function FilterSidebar({ facets, filters, onToggleSystem, onToggleCategory, onToggleGenre, onSetLanguage, onSetFolder, onReset }) {
  const hasActiveFilters = filters.systems.length > 0 || filters.categories.length > 0 || filters.genres.length > 0 || filters.language || filters.folder

  return (
    <aside style={{ minWidth: 220, maxWidth: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2d5016' }}>Filters</h3>
        {hasActiveFilters && (
          <button onClick={onReset} aria-label="Reset filters" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#c5913e', textDecoration: 'underline' }}>Reset</button>
        )}
      </div>

      {/* Language */}
      {facets.languages?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' }}>Language</h4>
          {facets.languages.map(({ value, label, count }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0', fontSize: 14 }}>
              <input
                type="radio"
                name="language"
                checked={filters.language === value}
                onChange={() => onSetLanguage(value)}
                aria-label={label}
              />
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ color: '#999', fontSize: 12 }}>{count}</span>
            </label>
          ))}
        </div>
      )}

      {/* System / Category / Genre from LLM enrichment */}
      <FacetGroup title="System" items={facets.systems} active={filters.systems} onToggle={onToggleSystem} />
      <FacetGroup title="Category" items={facets.categories} active={filters.categories} onToggle={onToggleCategory} />
      <FacetGroup title="Genre" items={facets.genres} active={filters.genres} onToggle={onToggleGenre} />

      {/* Folder */}
      {facets.folders?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' }}>Folder</h4>
          {facets.folders.slice(0, 20).map(({ value, count }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0', fontSize: 13 }}>
              <input
                type="radio"
                name="folder"
                checked={filters.folder === value}
                onChange={() => onSetFolder(value)}
                aria-label={value}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              <span style={{ color: '#999', fontSize: 12, flexShrink: 0 }}>{count}</span>
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
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' }}>{title}</h4>
      {items.map(({ value, count }) => (
        <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0', fontSize: 14 }}
          onClick={() => onToggle(value)}>
          <input
            type="checkbox"
            checked={active.includes(value)}
            onChange={() => onToggle(value)}
            aria-label={value}
          />
          <span style={{ flex: 1 }}>{value}</span>
          <span style={{ color: '#999', fontSize: 12 }}>{count}</span>
        </label>
      ))}
    </div>
  )
}
