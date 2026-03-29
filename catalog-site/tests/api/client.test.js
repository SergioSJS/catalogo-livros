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

describe('patchPersonalFields', () => {
  it('calls PATCH /api/books/{hash}/personal', async () => {
    const { patchPersonalFields } = await import('../../src/api/client.js')
    mockFetch.mockReturnValue(mockOk({ read_status: 'read', score: 5 }))
    await patchPersonalFields('abc123', { read_status: 'read', score: 5 })
    expect(mockFetch.mock.calls[0][0]).toContain('/api/books/abc123/personal')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })

  it('sends JSON body', async () => {
    const { patchPersonalFields } = await import('../../src/api/client.js')
    mockFetch.mockReturnValue(mockOk({}))
    await patchPersonalFields('abc123', { score: 4 })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.score).toBe(4)
  })
})

describe('fetchBooks personal filters', () => {
  it('passes read_status param', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ read_status: 'read' })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('read_status')).toBe('read')
  })

  it('passes solo_friendly param', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ solo_friendly: true })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('solo_friendly')).toBe('true')
  })

  it('passes played_status param', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ played_status: 'played' })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('played_status')).toBe('played')
  })

  it('passes score_min and score_max params', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ score_min: 3, score_max: 5 })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('score_min')).toBe('3')
    expect(url.searchParams.get('score_max')).toBe('5')
  })
})

describe('fetchBooks extra filters', () => {
  it('passes multiple tags as repeated params', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ tags: ['solo', 'osr'] })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.getAll('tag')).toEqual(['solo', 'osr'])
  })

  it('passes multiple categories', async () => {
    mockFetch.mockReturnValue(mockOk({ items: [], pagination: {} }))
    await fetchBooks({ categories: ['Core Rulebook', 'Supplement'] })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.getAll('category')).toEqual(['Core Rulebook', 'Supplement'])
  })
})

describe('fetchFacets extra params', () => {
  it('passes multiple systems', async () => {
    mockFetch.mockReturnValue(mockOk({}))
    await fetchFacets({ systems: ['OSR', 'PbtA'] })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.getAll('system')).toEqual(['OSR', 'PbtA'])
  })

  it('passes folder param', async () => {
    mockFetch.mockReturnValue(mockOk({}))
    await fetchFacets({ folder: 'RPG/EN' })
    const url = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('folder')).toBe('RPG/EN')
  })
})

describe('patchBookMetadata', () => {
  it('calls PATCH /api/books/{hash}/metadata', async () => {
    const { patchBookMetadata } = await import('../../src/api/client.js')
    mockFetch.mockReturnValue(mockOk({ title: 'Novo Título' }))
    await patchBookMetadata('abc123', { title: 'Novo Título' })
    expect(mockFetch.mock.calls[0][0]).toContain('/api/books/abc123/metadata')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })

  it('sends JSON body with tags as arrays', async () => {
    const { patchBookMetadata } = await import('../../src/api/client.js')
    mockFetch.mockReturnValue(mockOk({}))
    await patchBookMetadata('abc123', { system_tags: ['OSR'], custom_tags: [] })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.system_tags).toEqual(['OSR'])
    expect(body.custom_tags).toEqual([])
  })
})

describe('postIndex options', () => {
  it('sends force_reindex flag', async () => {
    mockFetch.mockReturnValue(mockOk({ job_id: 'x', status: 'started' }))
    await postIndex({ forceReindex: true })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.force_reindex).toBe(true)
  })

  it('sends dry_run flag', async () => {
    mockFetch.mockReturnValue(mockOk({ job_id: 'x', status: 'started' }))
    await postIndex({ dryRun: true })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.dry_run).toBe(true)
  })

  it('sends folders array', async () => {
    mockFetch.mockReturnValue(mockOk({ job_id: 'x', status: 'started' }))
    await postIndex({ folders: ['RPG/EN', 'RPG/PT'] })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.folders).toEqual(['RPG/EN', 'RPG/PT'])
  })
})
