import { useState, useEffect } from 'react'
import { fetchStats } from '../api/client.js'

export function StatsPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
      .then(data => { setStats(data); setLoading(false) })
      .catch(err => { setError(err); setLoading(false) })
  }, [])

  if (loading) return <div className="stats-panel"><span>Carregando…</span></div>
  if (error) return <div className="stats-panel"><span>Erro ao carregar estatísticas</span></div>
  if (!stats) return null

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        <StatCard label="Livros" value={stats.total_books} />
        <StatCard label="Tamanho" value={stats.total_size_human} />
        <StatCard label="Páginas" value={stats.total_pages} />
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">Por idioma</h3>
        <ul className="stats-list">
          {Object.entries(stats.by_language).map(([lang, count]) => (
            <li key={lang} className="stats-row">
              <span className="stats-row-label">{lang}</span>
              <span className="stats-row-count">{count}</span>
            </li>
          ))}
        </ul>
      </div>

      {stats.by_system_top10?.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Top sistemas</h3>
          <ul className="stats-list">
            {stats.by_system_top10.map(({ value, count }) => (
              <li key={value} className="stats-row">
                <span className="stats-row-label">{value}</span>
                <BarRow count={count} max={stats.by_system_top10[0].count} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.by_category?.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Categorias</h3>
          <ul className="stats-list">
            {stats.by_category.map(({ value, count }) => (
              <li key={value} className="stats-row">
                <span className="stats-row-label">{value}</span>
                <span className="stats-row-count">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function BarRow({ count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="stats-bar-wrap">
      <div className="stats-bar" style={{ width: `${pct}%` }} />
      <span className="stats-row-count">{count}</span>
    </div>
  )
}
