const LANG_LABEL = { en: 'EN', pt: 'PT' }

export function BookCard({ book, onSelect }) {
  const { title, language, system_tags, category_tags, genre_tags, page_count, thumbnail_url, parent_folder, score } = book

  return (
    <button onClick={() => onSelect(book)} className="book-card">
      <div className="card-thumb-wrap">
        {thumbnail_url ? (
          <img src={thumbnail_url} alt={title} className="card-thumb" />
        ) : (
          <img
            src={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='200' viewBox='0 0 150 200'><rect width='150' height='200' fill='%232d5016'/><text x='75' y='110' text-anchor='middle' fill='%23c5913e' font-size='14' font-family='serif'>${encodeURIComponent(parent_folder ?? '')}</text></svg>`}
            alt={title}
            className="card-thumb"
          />
        )}
        {language && (
          <span className="card-lang">{LANG_LABEL[language] ?? language.toUpperCase()}</span>
        )}
        <div className="card-score-overlay" data-testid="score-overlay">
          {score != null ? '★'.repeat(score) : 'Sem nota'}
        </div>
      </div>
      <div className="card-body">
        <span className="card-title">{title}</span>
        <div className="card-meta">
          {system_tags?.map(t => <span key={t} className="tag-pill tag-system">{t}</span>)}
          {category_tags?.slice(0, 1).map(t => <span key={t} className="tag-pill tag-category">{t}</span>)}
          {genre_tags?.slice(0, 1).map(t => <span key={t} className="tag-pill tag-genre">{t}</span>)}
          {page_count && <span className="card-pages">{page_count}p</span>}
        </div>
      </div>
    </button>
  )
}
