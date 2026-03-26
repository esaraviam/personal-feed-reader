import { useState, useCallback, useEffect } from 'react';
import type { DigestResponse } from '../domain/digestTypes';
import { fetchDigest, invalidateDigestCache } from '../services/digestService';

interface UseDigestResult {
  digest: DigestResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDigest(): UseDigestResult {
  const [digest, setDigest]   = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (invalidate = false) => {
    setLoading(true);
    setError(null);
    if (invalidate) invalidateDigestCache();
    try {
      const data = await fetchDigest();
      setDigest(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { digest, loading, error, refresh };
}
