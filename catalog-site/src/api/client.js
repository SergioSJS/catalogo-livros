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

export function fetchBooks({ page = 1, perPage = 24, q, language, systems = [], categories = [], genres = [], tags = [], systems_not = [], categories_not = [], genres_not = [], tags_not = [], folder, sort, read_status, played_status, solo_friendly, score_min, score_max } = {}) {
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
  systems_not.forEach(s => url.searchParams.append('system_not', s))
  categories_not.forEach(c => url.searchParams.append('category_not', c))
  genres_not.forEach(g => url.searchParams.append('genre_not', g))
  tags_not.forEach(t => url.searchParams.append('tag_not', t))
  if (read_status) url.searchParams.set('read_status', read_status)
  if (played_status) url.searchParams.set('played_status', played_status)
  if (solo_friendly != null) url.searchParams.set('solo_friendly', String(solo_friendly))
  if (score_min != null) url.searchParams.set('score_min', score_min)
  if (score_max != null) url.searchParams.set('score_max', score_max)

  return apiFetch(url.pathname + url.search)
}

export function fetchBook(hash) {
  return apiFetch(`/api/books/${hash}`)
}

export function fetchFacets({ language, systems = [], categories = [], genres = [], folder } = {}) {
  const url = new URL('/api/facets', window?.location?.origin ?? 'http://localhost')
  if (language) url.searchParams.set('language', language)
  if (folder) url.searchParams.set('folder', folder)
  systems.forEach(s => url.searchParams.append('system', s))
  categories.forEach(c => url.searchParams.append('category', c))
  genres.forEach(g => url.searchParams.append('genre', g))
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

export function patchBookMetadata(hash, fields) {
  return apiFetch(`/api/books/${hash}/metadata`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

export function patchPersonalFields(hash, fields) {
  return apiFetch(`/api/books/${hash}/personal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}
