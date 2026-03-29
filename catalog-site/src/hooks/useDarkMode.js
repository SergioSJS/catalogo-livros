import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('rpg_dark_mode') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try { localStorage.setItem('rpg_dark_mode', String(dark)) } catch {}
  }, [dark])

  function toggle() {
    setDark(d => !d)
  }

  return { dark, toggle }
}
