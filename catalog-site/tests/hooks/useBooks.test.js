import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useBooks } from '../../src/hooks/useBooks.js'
import { BOOKS_RESPONSE } from '../msw-handlers.js'

const server = setupServer(
  http.get('/api/books', () => HttpResponse.json(BOOKS_RESPONSE))
)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('useBooks', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useBooks({ page: 1 }))
    expect(result.current.loading).toBe(true)
  })

  it('fetches and returns books', async () => {
    const { result } = renderHook(() => useBooks({ page: 1 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].title).toBe('Mausritter')
  })

  it('returns pagination info', async () => {
    const { result } = renderHook(() => useBooks({ page: 1 }))
    await waitFor(() => !result.current.loading)
    expect(result.current.pagination.total_items).toBe(2)
  })

  it('sets error state on HTTP failure', async () => {
    server.use(http.get('/api/books', () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useBooks({ page: 1 }))
    await waitFor(() => expect(result.current.error).toBeTruthy())
  })

  it('re-fetches when filters change', async () => {
    let callCount = 0
    server.use(http.get('/api/books', () => { callCount++; return HttpResponse.json(BOOKS_RESPONSE) }))
    const { result, rerender } = renderHook(({ filters }) => useBooks(filters), {
      initialProps: { filters: { page: 1 } },
    })
    await waitFor(() => !result.current.loading)
    rerender({ filters: { page: 1, language: 'pt' } })
    await waitFor(() => callCount >= 2)
    expect(callCount).toBeGreaterThanOrEqual(2)
  })
})
