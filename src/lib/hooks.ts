import { useCallback, useEffect, useState } from 'react'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, [...deps, tick])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    run()
      .then((d) => {
        if (alive) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e: Error) => {
        if (alive) {
          setError(e.message || 'Something went wrong')
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [run])

  return { data, error, loading, reload: () => setTick((t) => t + 1) }
}