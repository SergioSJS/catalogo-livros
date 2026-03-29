import { http, HttpResponse } from 'msw'

export const BOOKS_RESPONSE = {
  items: [
    { file_hash: 'hash_a', title: 'Mausritter', filename: 'mausritter.pdf', parent_folder: 'Mausritter', language: 'en', file_size: 1024, file_size_human: '1.0 KB', page_count: 48, thumbnail_url: null, summary: 'A mouse RPG.', system_tags: ['OSR'], category_tags: ['Core Rulebook'], genre_tags: ['Fantasy'], custom_tags: [], llm_confidence: 0.9, indexed_at: '2026-01-01T00:00:00Z' },
    { file_hash: 'hash_b', title: 'Cairn', filename: 'cairn.pdf', parent_folder: 'Cairn', language: 'en', file_size: 2048, file_size_human: '2.0 KB', page_count: 60, thumbnail_url: null, summary: null, system_tags: ['OSR'], category_tags: ['Core Rulebook'], genre_tags: ['Fantasy'], custom_tags: [], llm_confidence: null, indexed_at: '2026-01-02T00:00:00Z' },
  ],
  pagination: { page: 1, per_page: 24, total_items: 2, total_pages: 1 },
}

export const FACETS_RESPONSE = {
  languages: [{ value: 'en', label: 'English', count: 2 }],
  systems: [{ value: 'OSR', count: 2 }],
  categories: [{ value: 'Core Rulebook', count: 2 }],
  genres: [{ value: 'Fantasy', count: 2 }],
  folders: [{ value: 'Mausritter', count: 1 }],
}

export const STATUS_IDLE = {
  status: 'idle', current_job: null, progress: {}, last_run: null, errors_log: [],
}

export const STATUS_INDEXING = {
  status: 'indexing', current_job: 'idx-001', progress: { phase: 'extracting', total_files: 10, processed: 3, new_files: 3, skipped: 0, errors: 0, current_file: 'EN/Mausritter/book.pdf', elapsed_seconds: 5 }, last_run: null, errors_log: [],
}

export const STATUS_ENRICH_IDLE = {
  status: 'idle', current_job: null, progress: {}, last_run: null, errors_log: [],
}

export const STATUS_ENRICHING = {
  status: 'enriching', current_job: 'enr-001', progress: { phase: 'enriching', total: 10, processed: 3, errors: 0, current_file: 'mausritter.pdf' }, last_run: null, errors_log: [],
}

export const handlers = [
  http.get('/api/books', () => HttpResponse.json(BOOKS_RESPONSE)),
  http.get('/api/books/:hash', ({ params }) =>
    HttpResponse.json({ ...BOOKS_RESPONSE.items[0], file_hash: params.hash, relative_path: `EN/Game/${params.hash}.pdf` })
  ),
  http.get('/api/facets', () => HttpResponse.json(FACETS_RESPONSE)),
  http.get('/api/stats', () => HttpResponse.json({ total_books: 2, total_size_bytes: 3072, total_size_human: '3.0 KB', total_pages: 108, by_language: { en: 2 }, by_system_top10: [], by_category: [], oldest_indexed: null, newest_indexed: null })),
  http.get('/api/index/status', () => HttpResponse.json(STATUS_IDLE)),
  http.post('/api/index', () => HttpResponse.json({ job_id: 'idx-001', status: 'started', message: 'Indexing started' }, { status: 202 })),
  http.get('/api/enrich/status', () => HttpResponse.json(STATUS_ENRICH_IDLE)),
  http.post('/api/enrich', () => HttpResponse.json({ job_id: 'enr-001', status: 'started', message: 'Enrichment started' }, { status: 202 })),
  http.get('/api/enrich/failed-count', () => HttpResponse.json({ count: 0 })),
  http.get('/api/version', () => HttpResponse.json({ version: '0.0.0' })),
]
