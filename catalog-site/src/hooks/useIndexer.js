import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchIndexStatus, postIndex } from '../api/client.js'

const POLL_INTERVAL = 2000

export function useIndexer() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  const poll = useCallback(() => {
    fetchIndexStatus()
      .then(data => {
        setStatus(data.status)
        setProgress(data.progress ?? null)
        setError(null)
        if (data.status === 'indexing') {
          timerRef.current = setTimeout(poll, POLL_INTERVAL)
        }
      })
      .catch(err => {
        setError(err)
      })
  }, [])

  useEffect(() => {
    poll()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [poll])

  const startIndex = useCallback(async (opts) => {
    await postIndex(opts)
    poll()
  }, [poll])

  return {
    status,
    isIndexing: status === 'indexing',
    progress,
    error,
    startIndex,
  }
}
