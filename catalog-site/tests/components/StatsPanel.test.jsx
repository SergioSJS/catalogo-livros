import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { StatsPanel } from '../../src/components/StatsPanel.jsx'

const STATS = {
  total_books: 42,
  total_size_bytes: 104857600,
  total_size_human: '100.0 MB',
  total_pages: 3200,
  by_language: { en: 30, pt: 12 },
  by_system_top10: [
    { value: 'OSR', count: 15 },
    { value: 'PbtA', count: 10 },
  ],
  by_category: [
    { value: 'Core Rulebook', count: 20 },
  ],
  oldest_indexed: '2025-01-01T00:00:00Z',
  newest_indexed: '2026-03-01T00:00:00Z',
  by_read_status: { unread: 20, reading: 12, read: 10 },
  by_played_status: { unplayed: 35, playing: 5, played: 2 },
  by_score: { 5: 3, 4: 6, 3: 2 },
  with_review: 8,
  avg_score: 4.1,
}

const server = setupServer(
  http.get('/api/stats', () => HttpResponse.json(STATS))
)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('StatsPanel', () => {
  it('shows total books count', async () => {
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument())
  })

  it('shows total size', async () => {
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText('100.0 MB')).toBeInTheDocument())
  })

  it('shows total pages', async () => {
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText('3200')).toBeInTheDocument())
  })

  it('shows average score card', async () => {
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText(/4\.1.*★/)).toBeInTheDocument())
  })

  it('shows with_review count', async () => {
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText('8')).toBeInTheDocument())
  })

  it('shows read status breakdown', async () => {
    render(<StatsPanel />)
    await waitFor(() => {
      expect(screen.getByText('Lido')).toBeInTheDocument()
      expect(screen.getByText('Lendo')).toBeInTheDocument()
      expect(screen.getByText('Não lido')).toBeInTheDocument()
    })
  })

  it('shows played status breakdown', async () => {
    render(<StatsPanel />)
    await waitFor(() => {
      expect(screen.getByText('Progresso de jogo')).toBeInTheDocument()
      expect(screen.getByText('Jogando')).toBeInTheDocument()
    })
  })

  it('shows score distribution', async () => {
    render(<StatsPanel />)
    await waitFor(() => {
      expect(screen.getByText('★★★★★')).toBeInTheDocument()
      expect(screen.getByText('★★★★')).toBeInTheDocument()
    })
  })

  it('shows language breakdown', async () => {
    render(<StatsPanel />)
    await waitFor(() => {
      expect(screen.getByText('en')).toBeInTheDocument()
      expect(screen.getByText('pt')).toBeInTheDocument()
    })
  })

  it('shows top systems', async () => {
    render(<StatsPanel />)
    await waitFor(() => {
      expect(screen.getByText('OSR')).toBeInTheDocument()
      expect(screen.getByText('PbtA')).toBeInTheDocument()
    })
  })

  it('shows top categories', async () => {
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText('Core Rulebook')).toBeInTheDocument())
  })

  it('shows loading state initially', () => {
    server.use(http.get('/api/stats', () => new Promise(() => {})))
    render(<StatsPanel />)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    server.use(http.get('/api/stats', () => HttpResponse.json({}, { status: 500 })))
    render(<StatsPanel />)
    await waitFor(() => expect(screen.getByText(/erro/i)).toBeInTheDocument())
  })
})
