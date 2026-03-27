const LANG_LABEL = { en: 'EN', pt: 'PT' }

export function BookCard({ book, onSelect }) {
  const { title, language, system_tags, page_count, thumbnail_url, parent_folder } = book

  return (
    <button
      onClick={() => onSelect(book)}
      className="book-card"
      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #e5e5e5', boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left', width: '100%' }}
    >
      <div style={{ position: 'relative', marginBottom: 8 }}>
        {thumbnail_url ? (
          <img src={thumbnail_url} alt={title} role="img" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <img
            src={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='200' viewBox='0 0 150 200'><rect width='150' height='200' fill='%232d5016'/><text x='75' y='110' text-anchor='middle' fill='%23c5913e' font-size='14' font-family='serif'>${encodeURIComponent(parent_folder ?? '')}</text></svg>`}
            alt={title}
            role="img"
            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8 }}
          />
        )}
        {language && (
          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
            {LANG_LABEL[language] ?? language.toUpperCase()}
          </span>
        )}
      </div>
      <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{title}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
        {system_tags?.map(t => (
          <span key={t} style={{ background: '#2d5016', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>{t}</span>
        ))}
        {page_count && (
          <span style={{ color: '#888', fontSize: 11, marginLeft: 'auto' }}>{page_count}p</span>
        )}
      </div>
    </button>
  )
}
