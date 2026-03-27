import { useState, useEffect } from 'react'
import { fetchBooks } from '../api/client.js'

export function useBooks(filters = {}) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBooks(filters)
      .then(data => {
        if (!cancelled) {
          setItems(data.items)
          setPagination(data.pagination)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return { items, pagination, loading, error }
}
