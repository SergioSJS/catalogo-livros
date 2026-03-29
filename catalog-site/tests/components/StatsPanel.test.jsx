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
    { value: 'D&D 5e', count: 8 },
  ],
  by_category: [
    { value: 'Core Rulebook', count: 20 },
    { value: 'Supplement', count: 14 },
  ],
  oldest_indexed: '2025-01-01T00:00:00Z',
  newest_indexed: '2026-03-01T00:00:00Z',
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

  it('shows language breakdown', async () => {
    render(<StatsPanel />)
    await waitFor(() => {
      expect(screen.getByText('en')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('pt')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
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
    await waitFor(() => {
      expect(screen.getByText('Core Rulebook')).toBeInTheDocument()
      expect(screen.getByText('Supplement')).toBeInTheDocument()
    })
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
