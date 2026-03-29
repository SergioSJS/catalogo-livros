import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchEnrichStatus, postEnrich } from '../api/client.js'

const POLL_INTERVAL = 2000

export function useEnricher() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  const poll = useCallback(() => {
    fetchEnrichStatus()
      .then(data => {
        setStatus(data.status)
        setProgress(data.progress ?? null)
        setError(null)
        if (data.status === 'enriching') {
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

  const startEnrich = useCallback(async (opts) => {
    await postEnrich(opts)
    poll()
  }, [poll])

  return {
    status,
    isEnriching: status === 'enriching',
    progress,
    error,
    startEnrich,
  }
}
