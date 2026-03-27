import { useState, useCallback, useEffect, useRef } from 'react'

export function useSearch() {
  const [inputValue, setInputValueState] = useState('')
  const [q, setQ] = useState('')
  const timerRef = useRef(null)

  const setInput = useCallback((val) => {
    setInputValueState(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setQ(val), 300)
  }, [])

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setInputValueState('')
    setQ('')
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { inputValue, q, setInput, clear }
}
