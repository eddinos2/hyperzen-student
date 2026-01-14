import { useEffect, useState } from 'react';

/**
 * Hook pour debouncer une valeur (optimise les recherches)
 * @param value - La valeur à debouncer
 * @param delay - Le délai en ms (défaut: 300ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
