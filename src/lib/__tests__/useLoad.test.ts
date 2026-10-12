import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLoad, errorMessage } from '../useLoad';

describe('useLoad', () => {
  it('starts with no data and no error, then returns the loaded data', async () => {
    const { result } = renderHook(() => useLoad(() => Promise.resolve(42), []));
    expect(result.current).toEqual({ data: undefined, error: null });
    await waitFor(() => expect(result.current).toEqual({ data: 42, error: null }));
  });

  it('reports a rejected load as an error message', async () => {
    const { result } = renderHook(() =>
      useLoad(() => Promise.reject({ message: 'permission denied' }), [])
    );
    await waitFor(() => expect(result.current).toEqual({ data: undefined, error: 'permission denied' }));
  });

  it('ignores a response that arrives after the deps changed', async () => {
    const resolvers: Record<string, (value: string) => void> = {};
    const { result, rerender } = renderHook(
      ({ id }) => useLoad(() => new Promise<string>((resolve) => (resolvers[id] = resolve)), [id]),
      { initialProps: { id: 'a' } }
    );
    await waitFor(() => expect(resolvers.a).toBeDefined());
    rerender({ id: 'b' });
    await waitFor(() => expect(resolvers.b).toBeDefined());

    resolvers.b('vehicle b');
    await waitFor(() => expect(result.current.data).toBe('vehicle b'));
    resolvers.a('vehicle a');
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.data).toBe('vehicle b');
  });
});

describe('errorMessage', () => {
  it('reads the message from Error instances and plain Supabase error objects', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage({ message: 'JWT expired', code: 'PGRST301' })).toBe('JWT expired');
    expect(errorMessage('offline')).toBe('offline');
  });
});
