import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchBooks, fetchBook, fetchFacets, fetchStats, postIndex, fetchIndexStatus } from '../../src/api/client.js'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(data) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
}

function mockError(status) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ detail: 'Error' }) })
}

beforeEach(() => mockFetch.mockReset())

describe('fetchBooks', () => {
  it('builds URL with default params', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({})
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/books')
  })

  it('passes page and per_page', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ page: 2, perPage: 12 })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('per_page')).toBe('12')
  })

  it('passes q param for search', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ q: 'mausritter' })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('q')).toBe('mausritter')
  })

  it('passes multiple system filters as repeated params', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ systems: ['OSR', 'PbtA'] })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.getAll('system')).toEqual(['OSR', 'PbtA'])
  })

  it('omits empty array filters', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ systems: [] })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.has('system')).toBe(false)
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockReturnValue(mockError(500))
    await expect(fetchBooks({})).rejects.toThrow()
  })
})

describe('fetchBook', () => {
  it('calls /api/books/:hash', async () => {
    mockFetch.mockReturnValue(mockOk({ file_hash: 'abc123' }))
    const result = await fetchBook('abc123')
    expect(mockFetch.mock.calls[0][0]).toContain('/api/books/abc123')
    expect(result.file_hash).toBe('abc123')
  })
})

describe('fetchFacets', () => {
  it('calls /api/facets', async () => {
    mockFetch.mockReturnValue(mockOk({ languages: [], systems: [] }))
    await fetchFacets({})
    expect(mockFetch.mock.calls[0][0]).toContain('/api/facets')
  })

  it('passes language filter', async () => {
    mockFetch.mockReturnValue(mockOk({ languages: [] }))
    await fetchFacets({ language: 'pt' })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('language')).toBe('pt')
  })
})

describe('fetchStats', () => {
  it('calls /api/stats', async () => {
    mockFetch.mockReturnValue(mockOk({ total_books: 10 }))
    await fetchStats()
    expect(mockFetch.mock.calls[0][0]).toContain('/api/stats')
  })
})

describe('postIndex', () => {
  it('calls POST /api/index', async () => {
    mockFetch.mockReturnValue(mockOk({ job_id: 'idx-1', status: 'started' }))
    await postIndex({})
    expect(mockFetch.mock.calls[0][0]).toContain('/api/index')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
  })
})

describe('fetchIndexStatus', () => {
  it('calls /api/index/status', async () => {
    mockFetch.mockReturnValue(mockOk({ status: 'idle' }))
    await fetchIndexStatus()
    expect(mockFetch.mock.calls[0][0]).toContain('/api/index/status')
  })
})
