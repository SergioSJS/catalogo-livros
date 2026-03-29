import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useEnricher } from '../../src/hooks/useEnricher.js'
import { STATUS_ENRICH_IDLE, STATUS_ENRICHING } from '../msw-handlers.js'

vi.useFakeTimers({ shouldAdvanceTime: true })

const server = setupServer(
  http.get('/api/enrich/status', () => HttpResponse.json(STATUS_ENRICH_IDLE)),
  http.post('/api/enrich', () => HttpResponse.json({ job_id: 'enr-001', status: 'started' }, { status: 202 })),
  http.get('/api/enrich/failed-count', () => HttpResponse.json({ count: 0 }))
)
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.clearAllTimers() })
afterAll(() => server.close())

describe('useEnricher', () => {
  it('starts as idle', async () => {
    const { result } = renderHook(() => useEnricher())
    await waitFor(() => result.current.status === 'idle')
    expect(result.current.status).toBe('idle')
    expect(result.current.isEnriching).toBe(false)
  })

  it('startEnrich calls POST /api/enrich', async () => {
    let posted = false
    server.use(http.post('/api/enrich', () => { posted = true; return HttpResponse.json({ job_id: 'enr-001', status: 'started' }, { status: 202 }) }))
    const { result } = renderHook(() => useEnricher())
    await act(() => result.current.startEnrich())
    expect(posted).toBe(true)
  })

  it('shows enriching state while running', async () => {
    server.use(http.get('/api/enrich/status', () => HttpResponse.json(STATUS_ENRICHING)))
    const { result } = renderHook(() => useEnricher())
    await waitFor(() => { expect(result.current.isEnriching).toBe(true) })
    expect(result.current.progress.total).toBe(10)
  })

  it('stops polling when enriching completes', async () => {
    let calls = 0
    server.use(
      http.get('/api/enrich/status', () => {
        calls++
        return HttpResponse.json(calls <= 2 ? STATUS_ENRICHING : STATUS_ENRICH_IDLE)
      })
    )
    const { result } = renderHook(() => useEnricher())
    await act(() => vi.advanceTimersByTimeAsync(5000))
    await waitFor(() => {
      expect(result.current.status).toBe('idle')
      expect(calls).toBeGreaterThanOrEqual(3)
    })
    expect(result.current.isEnriching).toBe(false)
  })

  it('exposes failedCount from /api/enrich/failed-count', async () => {
    server.use(http.get('/api/enrich/failed-count', () => HttpResponse.json({ count: 5 })))
    const { result } = renderHook(() => useEnricher())
    await waitFor(() => expect(result.current.failedCount).toBe(5))
  })

  it('startEnrichRetry posts retry_failed: true', async () => {
    let body = null
    server.use(
      http.post('/api/enrich', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ job_id: 'enr-002', status: 'started' }, { status: 202 })
      })
    )
    const { result } = renderHook(() => useEnricher())
    await act(() => result.current.startEnrichRetry())
    expect(body).toMatchObject({ retry_failed: true })
  })

  it('failedCount refreshes after enrichment completes', async () => {
    let failCount = 3
    server.use(
      http.get('/api/enrich/failed-count', () => HttpResponse.json({ count: failCount })),
      http.get('/api/enrich/status', () => {
        failCount = 0
        return HttpResponse.json(STATUS_ENRICH_IDLE)
      })
    )
    const { result } = renderHook(() => useEnricher())
    await waitFor(() => expect(result.current.failedCount).toBe(0))
  })
})
