import { useEffect, useState } from 'react'

/** 입력이 멈추고 delay(ms) 뒤에 값이 바뀐다 (검색어 입력마다 요청하지 않도록) */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}
