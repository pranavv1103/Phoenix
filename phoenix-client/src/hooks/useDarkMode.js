import { useState, useEffect } from 'react'

const DARK_MODE_KEY = 'theme-preference'

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if window is available (for SSR compatibility)
    if (typeof window === 'undefined') return false
    
    // Check localStorage first
    const saved = localStorage.getItem(DARK_MODE_KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
    
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem(DARK_MODE_KEY, 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem(DARK_MODE_KEY, 'light')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  return { isDarkMode, toggleDarkMode }
}
