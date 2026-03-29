import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../src/App.jsx'

// Mock hooks
vi.mock('../src/hooks/useBooks.js', () => ({
  useBooks: vi.fn(),
}))
vi.mock('../src/hooks/useFacets.js', () => ({
  useFacets: vi.fn(),
}))
vi.mock('../src/hooks/useIndexer.js', () => ({
  useIndexer: vi.fn(),
}))
// Mock api client used by BookModal and App
vi.mock('../src/api/client.js', () => ({
  patchPersonalFields: vi.fn(),
  patchBookMetadata: vi.fn(),
  patchBooksBulk: vi.fn().mockResolvedValue({ updated: 0 }),
  fetchRandomBook: vi.fn().mockResolvedValue({}),
  fetchVersion: vi.fn().mockResolvedValue({ version: '0.2.0' }),
  fetchEnrichStatus: vi.fn().mockResolvedValue({ status: 'idle', progress: null }),
  fetchEnrichFailedCount: vi.fn().mockResolvedValue({ count: 0 }),
  postEnrich: vi.fn().mockResolvedValue({ job_id: 'enr-1', status: 'started' }),
  fetchStats: vi.fn().mockResolvedValue({
    total_books: 10, total_size_human: '50 MB', total_pages: 500,
    by_language: { en: 8, pt: 2 }, by_system_top10: [{ value: 'OSR', count: 5 }],
    by_category: [], oldest_indexed: null, newest_indexed: null,
  }),
  buildExportUrl: vi.fn(() => '/api/export?format=json'),
}))

import { useBooks } from '../src/hooks/useBooks.js'
import { useFacets } from '../src/hooks/useFacets.js'
import { useIndexer } from '../src/hooks/useIndexer.js'
import { patchPersonalFields } from '../src/api/client.js'

const baseBook = {
  file_hash: 'abc123',
  title: 'Mausritter',
  filename: 'mausritter.pdf',
  relative_path: 'EN/OSR/mausritter.pdf',
  parent_folder: 'OSR',
  language: 'en',
  page_count: 48,
  file_size_human: '2.1 MB',
  system_tags: ['OSR'],
  category_tags: [],
  genre_tags: [],
  custom_tags: [],
  thumbnail_url: null,
  summary: 'A mouse RPG.',
  llm_confidence: null,
  llm_provider: null,
  read_status: 'unread',
  played_status: 'unplayed',
  solo_friendly: false,
  review: null,
  score: null,
}

const emptyFacets = { systems: [], categories: [], genres: [], languages: [], folders: [] }
const emptyPagination = { page: 1, total_pages: 1, total_items: 1, per_page: 24 }

beforeEach(() => {
  vi.clearAllMocks()
  useBooks.mockReturnValue({ items: [baseBook], pagination: emptyPagination, loading: false })
  useFacets.mockReturnValue({ facets: emptyFacets })
  useIndexer.mockReturnValue({ status: 'idle', progress: null, startIndex: vi.fn() })
  patchPersonalFields.mockResolvedValue({ ...baseBook, read_status: 'read' })
})

describe('App — localStorage persistence', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('restores page from localStorage on mount', () => {
    localStorage.setItem('rpg_page', '3')
    render(<App />)
    // page 3 should be passed to useBooks — verify by checking what page state was used
    // useBooks is mocked, but we can check what args it was called with
    const callArgs = useBooks.mock.calls.at(-1)[0]
    expect(callArgs.page).toBe(3)
  })

  it('saves page to localStorage when pagination occurs', () => {
    useBooks.mockReturnValue({
      items: [baseBook],
      pagination: { page: 1, total_pages: 3, total_items: 72, per_page: 24 },
      loading: false,
    })
    render(<App />)
    const navs = screen.getAllByRole('navigation', { name: /page navigation/i })
    // Click next on the bottom pagination
    fireEvent.click(within(navs[1]).getByRole('button', { name: /next/i }))
    expect(localStorage.getItem('rpg_page')).toBe('2')
  })
})

describe('App — pagination at top', () => {
  it('renders pagination above and below the grid when total_pages > 1', () => {
    useBooks.mockReturnValue({
      items: [baseBook],
      pagination: { page: 1, total_pages: 3, total_items: 72, per_page: 24 },
      loading: false,
    })
    render(<App />)
    // Should render two pagination components (one top, one bottom)
    const navs = screen.getAllByRole('navigation', { name: /page navigation/i })
    expect(navs.length).toBe(2)
  })
})

describe('App — stale modal data fix', () => {
  it('reopening a book after save shows updated data', async () => {
    const updatedBook = { ...baseBook, title: 'Mausritter (Updated)', read_status: 'read' }
    patchPersonalFields.mockResolvedValue(updatedBook)

    render(<App />)

    // Click the book card to open modal
    fireEvent.click(screen.getByText('Mausritter'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Change read status and save
    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    // Wait for save to complete (modal still open but state updated)
    await waitFor(() => {
      expect(patchPersonalFields).toHaveBeenCalled()
    })

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // After save, displayItems reflects updatedBook so card title changed too
    // Click same book card again — should open with updated title
    fireEvent.click(screen.getByText('Mausritter (Updated)'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Mausritter (Updated)')).toBeInTheDocument()
  })

  it('book with no prior updates opens with original data', () => {
    render(<App />)
    // card is a button with book title, clicking it opens modal
    const card = screen.getByRole('button', { name: /mausritter/i })
    fireEvent.click(card)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Mausritter')).toBeInTheDocument()
  })
})

describe('App — StatsPanel (C9)', () => {
  beforeEach(() => {
    useBooks.mockReturnValue({ items: [], pagination: emptyPagination, loading: false })
    useFacets.mockReturnValue({ facets: emptyFacets, loading: false })
    useIndexer.mockReturnValue({ status: 'idle', isIndexing: false, progress: null, error: null, startIndex: vi.fn() })
  })

  it('stats toggle button is in the header', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /estatísticas/i })).toBeInTheDocument()
  })

  it('StatsPanel is hidden by default', () => {
    render(<App />)
    expect(screen.queryByText(/por idioma/i)).not.toBeInTheDocument()
  })

  it('clicking stats toggle shows StatsPanel content', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /estatísticas/i }))
    await waitFor(() => expect(screen.getByText(/por idioma/i)).toBeInTheDocument())
  })
})
