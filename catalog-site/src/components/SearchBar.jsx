export function SearchBar({ value, onChange, onClear }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="search"
        role="searchbox"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search books…"
        style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' }}
      />
      {value && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  )
}
