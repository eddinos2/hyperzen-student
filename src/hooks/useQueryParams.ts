import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook pour gérer les paramètres d'URL (filtres persistants)
 */
export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (key: string, defaultValue?: string): string => {
      return searchParams.get(key) || defaultValue || '';
    },
    [searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | number) => {
      const newParams = new URLSearchParams(searchParams);
      if (value === '' || value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setParams = useCallback(
    (params: Record<string, string | number>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(params).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return { getParam, setParam, setParams };
}
