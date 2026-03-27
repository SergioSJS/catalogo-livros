import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useIndexer } from '../../src/hooks/useIndexer.js'
import { STATUS_IDLE, STATUS_INDEXING } from '../msw-handlers.js'

vi.useFakeTimers({ shouldAdvanceTime: true })

const server = setupServer(
  http.get('/api/index/status', () => HttpResponse.json(STATUS_IDLE)),
  http.post('/api/index', () => HttpResponse.json({ job_id: 'idx-001', status: 'started' }, { status: 202 }))
)
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.clearAllTimers() })
afterAll(() => server.close())

describe('useIndexer', () => {
  it('starts as idle', async () => {
    const { result } = renderHook(() => useIndexer())
    await waitFor(() => result.current.status === 'idle')
    expect(result.current.status).toBe('idle')
    expect(result.current.isIndexing).toBe(false)
  })

  it('startIndex calls POST /api/index', async () => {
    let posted = false
    server.use(http.post('/api/index', () => { posted = true; return HttpResponse.json({ job_id: 'idx-001', status: 'started' }, { status: 202 }) }))
    const { result } = renderHook(() => useIndexer())
    await act(() => result.current.startIndex())
    expect(posted).toBe(true)
  })

  it('shows indexing state while running', async () => {
    server.use(http.get('/api/index/status', () => HttpResponse.json(STATUS_INDEXING)))
    const { result } = renderHook(() => useIndexer())
    await waitFor(() => result.current.isIndexing === true)
    expect(result.current.progress.phase).toBe('extracting')
  })

  it('stops polling when status returns to idle', async () => {
    let calls = 0
    server.use(
      http.get('/api/index/status', () => {
        calls++
        return HttpResponse.json(calls <= 2 ? STATUS_INDEXING : STATUS_IDLE)
      })
    )
    const { result } = renderHook(() => useIndexer())
    // Advance fake time past 2 polling cycles to trigger 2 more polls
    await act(() => vi.advanceTimersByTimeAsync(5000))
    await waitFor(() => {
      expect(result.current.status).toBe('idle')
      expect(calls).toBeGreaterThanOrEqual(3)
    })
    expect(result.current.isIndexing).toBe(false)
  })
})
