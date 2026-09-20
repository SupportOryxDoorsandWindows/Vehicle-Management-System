import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, profileLoading, profile } = useAuth();
  if (loading || (profileLoading && !profile)) return null;
  if (profile?.role !== 'admin' || !profile.active) return <Navigate to="/" replace />;
  return <>{children}</>;
}
