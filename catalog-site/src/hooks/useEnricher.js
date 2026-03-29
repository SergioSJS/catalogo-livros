import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchEnrichStatus, fetchEnrichFailedCount, postEnrich } from '../api/client.js'

const POLL_INTERVAL = 2000

export function useEnricher() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [failedCount, setFailedCount] = useState(0)
  const timerRef = useRef(null)

  const refreshFailedCount = useCallback(() => {
    fetchEnrichFailedCount()
      .then(data => setFailedCount(data.count ?? 0))
      .catch(() => {})
  }, [])

  const poll = useCallback(() => {
    fetchEnrichStatus()
      .then(data => {
        setStatus(data.status)
        setProgress(data.progress ?? null)
        setError(null)
        refreshFailedCount()
        if (data.status === 'enriching') {
          timerRef.current = setTimeout(poll, POLL_INTERVAL)
        }
      })
      .catch(err => {
        setError(err)
      })
  }, [refreshFailedCount])

  useEffect(() => {
    poll()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [poll])

  const startEnrich = useCallback(async (opts) => {
    await postEnrich(opts)
    poll()
  }, [poll])

  const startEnrichRetry = useCallback(async () => {
    await postEnrich({ retryFailed: true })
    poll()
  }, [poll])

  return {
    status,
    isEnriching: status === 'enriching',
    progress,
    error,
    failedCount,
    startEnrich,
    startEnrichRetry,
  }
}
