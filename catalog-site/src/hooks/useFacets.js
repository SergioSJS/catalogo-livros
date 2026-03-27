import { useState, useEffect } from 'react'
import { fetchFacets } from '../api/client.js'

export function useFacets(filters = {}) {
  const [facets, setFacets] = useState({ systems: [], categories: [], genres: [], tags: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFacets(filters)
      .then(data => {
        if (!cancelled) { setFacets(data); setLoading(false) }
      })
      .catch(err => {
        if (!cancelled) { setError(err); setLoading(false) }
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.language])

  return { facets, loading, error }
}
