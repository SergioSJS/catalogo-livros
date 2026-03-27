import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useFacets } from '../../src/hooks/useFacets.js'
import { FACETS_RESPONSE } from '../msw-handlers.js'

const server = setupServer(
  http.get('/api/facets', () => HttpResponse.json(FACETS_RESPONSE))
)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('useFacets', () => {
  it('fetches and returns facets', async () => {
    const { result } = renderHook(() => useFacets({}))
    await waitFor(() => !result.current.loading)
    expect(result.current.facets.systems[0].value).toBe('OSR')
    expect(result.current.facets.systems[0].count).toBe(2)
  })

  it('passes language filter', async () => {
    let capturedUrl = ''
    server.use(http.get('/api/facets', ({ request }) => {
      capturedUrl = request.url
      return HttpResponse.json(FACETS_RESPONSE)
    }))
    const { result } = renderHook(() => useFacets({ language: 'pt' }))
    await waitFor(() => !result.current.loading)
    expect(capturedUrl).toContain('language=pt')
  })

  it('re-fetches when language changes', async () => {
    let calls = 0
    server.use(http.get('/api/facets', () => { calls++; return HttpResponse.json(FACETS_RESPONSE) }))
    const { rerender } = renderHook(({ lang }) => useFacets({ language: lang }), {
      initialProps: { lang: null },
    })
    await waitFor(() => calls >= 1)
    rerender({ lang: 'en' })
    await waitFor(() => calls >= 2)
    expect(calls).toBeGreaterThanOrEqual(2)
  })
})
