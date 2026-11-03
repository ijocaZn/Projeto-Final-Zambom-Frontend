import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';

/** Busca um endpoint; cancela a requisição anterior se `path` mudar ou o componente sair da tela. */
export function useApiData(path, { auth = true } = {}) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    apiRequest(path, { auth, signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((current) => ({ ...current, loading: false, error }));
      });
    return () => controller.abort();
  }, [path, auth, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}

/**
 * Busca vários endpoints em paralelo. Uma falha não derruba as demais:
 * cada resultado traz `{ data, error }` próprio.
 */
export function useApiMany(requests, { auth = true } = {}) {
  const requestKey = JSON.stringify(requests);
  const [state, setState] = useState({ results: {}, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const entries = Object.entries(JSON.parse(requestKey));
    if (entries.length === 0) {
      setState({ results: {}, loading: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true }));
    Promise.allSettled(
      entries.map(([, path]) => apiRequest(path, { auth, signal: controller.signal })),
    ).then((settled) => {
      if (controller.signal.aborted) return;
      const results = {};
      settled.forEach((outcome, index) => {
        results[entries[index][0]] = outcome.status === 'fulfilled'
          ? { data: outcome.value, error: null }
          : { data: null, error: outcome.reason };
      });
      setState({ results, loading: false });
    });
    return () => controller.abort();
  }, [requestKey, auth, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}

export function listOf(value) {
  const data = value && 'data' in value ? value.data : value;
  return Array.isArray(data) ? data : [];
}

/** Fica `true` quando `active` dura mais que `delay` — usado para avisar sobre o "cold start" do Render. */
export function useSlowFlag(active, delay = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
  return slow;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Comanda` : 'Comanda · Cardápio e gestão';
  }, [title]);
}
