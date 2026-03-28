export function SearchBar({ value, onChange, onClear }) {
  return (
    <div className="search-wrap">
      <input
        type="search"
        role="searchbox"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search books…"
        className="search-input"
      />
      {value && (
        <button onClick={onClear} aria-label="Clear search" className="search-clear">×</button>
      )}
    </div>
  )
}
