import { useState, useEffect } from 'react'
import { fetchStats } from '../api/client.js'

const READ_LABELS = { unread: 'Não lido', reading: 'Lendo', read: 'Lido' }
const PLAYED_LABELS = { unplayed: 'Não jogado', playing: 'Jogando', played: 'Jogado' }

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

  const readEntries = Object.entries(READ_LABELS).map(([k, label]) => ({
    label, count: stats.by_read_status?.[k] ?? 0,
  }))
  const playedEntries = Object.entries(PLAYED_LABELS).map(([k, label]) => ({
    label, count: stats.by_played_status?.[k] ?? 0,
  }))
  const maxRead = Math.max(...readEntries.map(e => e.count), 1)
  const maxPlayed = Math.max(...playedEntries.map(e => e.count), 1)

  const scoreEntries = [5, 4, 3, 2, 1].map(n => ({
    label: '★'.repeat(n),
    count: stats.by_score?.[n] ?? 0,
  }))
  const maxScore = Math.max(...scoreEntries.map(e => e.count), 1)

  return (
    <div className="stats-panel">
      {/* Top numbers */}
      <div className="stats-grid">
        <StatCard label="Livros" value={stats.total_books} />
        <StatCard label="Tamanho" value={stats.total_size_human} />
        <StatCard label="Páginas" value={stats.total_pages} />
        {stats.avg_score != null && (
          <StatCard label="Nota média" value={`${stats.avg_score.toFixed(1)} ★`} />
        )}
        {stats.with_review > 0 && (
          <StatCard label="Com review" value={stats.with_review} />
        )}
      </div>

      <div className="stats-columns">
        {/* Leitura */}
        <div className="stats-section">
          <h3 className="stats-section-title">Leitura</h3>
          <ul className="stats-list">
            {readEntries.map(({ label, count }) => (
              <li key={label} className="stats-row">
                <span className="stats-row-label">{label}</span>
                <BarRow count={count} max={maxRead} />
              </li>
            ))}
          </ul>
        </div>

        {/* Jogado */}
        <div className="stats-section">
          <h3 className="stats-section-title">Progresso de jogo</h3>
          <ul className="stats-list">
            {playedEntries.map(({ label, count }) => (
              <li key={label} className="stats-row">
                <span className="stats-row-label">{label}</span>
                <BarRow count={count} max={maxPlayed} />
              </li>
            ))}
          </ul>
        </div>

        {/* Notas (score) */}
        <div className="stats-section">
          <h3 className="stats-section-title">Notas</h3>
          <ul className="stats-list">
            {scoreEntries.map(({ label, count }) => (
              <li key={label} className="stats-row">
                <span className="stats-row-label" style={{ color: '#c5913e' }}>{label}</span>
                <BarRow count={count} max={maxScore} />
              </li>
            ))}
          </ul>
        </div>

        {/* Por idioma */}
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
      </div>

      {/* Top sistemas */}
      {stats.by_system_top10?.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Top sistemas</h3>
          <ul className="stats-list stats-list-row">
            {stats.by_system_top10.map(({ value, count }) => (
              <li key={value} className="stats-row">
                <span className="stats-row-label">{value}</span>
                <BarRow count={count} max={stats.by_system_top10[0].count} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categorias */}
      {stats.by_category?.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Categorias</h3>
          <ul className="stats-list stats-list-row">
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
