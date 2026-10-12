import { useEffect, useState, type DependencyList } from 'react';

export interface LoadState<T> {
  data: T | undefined;
  error: string | null;
}

// Supabase errors are plain objects with a message, not always Error instances.
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return String(err);
}

// Runs `load` whenever `deps` change. `data` is undefined until the first load
// succeeds; a failed load sets `error` instead of leaving the page silently empty.
// Responses that arrive after unmount or after `deps` changed are ignored.
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ data: undefined, error: null });

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(load)
      .then(
        (data) => {
          if (active) setState({ data, error: null });
        },
        (err: unknown) => {
          if (active) setState({ data: undefined, error: errorMessage(err) });
        }
      );
    return () => {
      active = false;
    };
    // The caller owns the dependency list, exactly as with useEffect itself.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
