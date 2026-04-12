import { useEffect, useRef, useState } from 'react'

export function useMinimumLoading(loading: boolean, minimumMs = 2000) {
  const [visible, setVisible] = useState(loading)
  const startedAtRef = useRef<number | null>(loading ? Date.now() : null)

  useEffect(() => {
    if (loading) {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now()
      }

      setVisible(true)
      return
    }

    if (startedAtRef.current === null) {
      setVisible(false)
      return
    }

    const elapsed = Date.now() - startedAtRef.current
    const remaining = Math.max(minimumMs - elapsed, 0)

    const timeout = window.setTimeout(() => {
      setVisible(false)
      startedAtRef.current = null
    }, remaining)

    return () => window.clearTimeout(timeout)
  }, [loading, minimumMs])

  return visible
}
