const BASE = import.meta.env?.VITE_API_URL ?? ''

function buildUrl(path, params = {}) {
  const url = new URL(path, window?.location?.origin ?? 'http://localhost')
  url.pathname = path

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, v))
    } else {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function apiFetch(path, options = {}) {
  const resp = await fetch(BASE + path, options)
  if (!resp.ok) {
    const err = new Error(`HTTP ${resp.status}`)
    err.status = resp.status
    throw err
  }
  return resp.json()
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export function fetchBooks({ page = 1, perPage = 24, q, language, systems = [], categories = [], genres = [], tags = [], folder, sort } = {}) {
  const params = { page, per_page: perPage }
  if (q) params.q = q
  if (language) params.language = language
  if (sort) params.sort = sort
  if (folder) params.folder = folder

  const url = new URL('/api/books', window?.location?.origin ?? 'http://localhost')
  url.searchParams.set('page', page)
  url.searchParams.set('per_page', perPage)
  if (q) url.searchParams.set('q', q)
  if (language) url.searchParams.set('language', language)
  if (sort) url.searchParams.set('sort', sort)
  if (folder) url.searchParams.set('folder', folder)
  systems.forEach(s => url.searchParams.append('system', s))
  categories.forEach(c => url.searchParams.append('category', c))
  genres.forEach(g => url.searchParams.append('genre', g))
  tags.forEach(t => url.searchParams.append('tag', t))

  return apiFetch(url.pathname + url.search)
}

export function fetchBook(hash) {
  return apiFetch(`/api/books/${hash}`)
}

export function fetchFacets({ language } = {}) {
  const url = new URL('/api/facets', window?.location?.origin ?? 'http://localhost')
  if (language) url.searchParams.set('language', language)
  return apiFetch(url.pathname + url.search)
}

export function fetchStats() {
  return apiFetch('/api/stats')
}

// ── Indexing ──────────────────────────────────────────────────────────────────

export function postIndex({ forceReindex = false, folders = [], dryRun = false } = {}) {
  return apiFetch('/api/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force_reindex: forceReindex, folders, dry_run: dryRun }),
  })
}

export function fetchIndexStatus() {
  return apiFetch('/api/index/status')
}
