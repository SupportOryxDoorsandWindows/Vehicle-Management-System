import { useAuth } from '../contexts/AuthContext';

/** UI gating only — RLS is what actually rejects a non-admin's writes. */
export function useIsAdmin(): boolean {
  const { profile } = useAuth();
  return profile?.role === 'admin' && profile.active;
}
