export function FilterSidebar({ facets, filters, onToggleSystem, onToggleCategory, onToggleGenre, onSetLanguage, onReset }) {
  const hasActiveFilters = filters.systems.length > 0 || filters.categories.length > 0 || filters.genres.length > 0 || filters.language

  return (
    <aside style={{ minWidth: 200, maxWidth: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2d5016' }}>Filters</h3>
        {hasActiveFilters && (
          <button onClick={onReset} aria-label="Reset filters" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#c5913e', textDecoration: 'underline' }}>Reset</button>
        )}
      </div>

      <FacetGroup title="System" items={facets.systems} active={filters.systems} onToggle={onToggleSystem} />
      <FacetGroup title="Category" items={facets.categories} active={filters.categories} onToggle={onToggleCategory} />
      <FacetGroup title="Genre" items={facets.genres} active={filters.genres} onToggle={onToggleGenre} />
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
