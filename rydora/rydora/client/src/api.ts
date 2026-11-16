import { useAuth } from '@clerk/clerk-react'; import { useCallback } from 'react';
export interface Place { label: string; lat: number; lng: number }
export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async <T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> => {
    const t = await getToken();
    const r = await fetch('/api' + path, { method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }, [getToken]);
}
