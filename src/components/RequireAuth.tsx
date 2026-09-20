import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, profileLoading, session, profile, signOut } = useAuth();
  const location = useLocation();
  if (loading || (profileLoading && !profile)) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile?.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-sm border border-oryx-silver rounded-lg p-6 text-center">
          <h1 className="text-xl font-bold text-oryx-blue mb-4">Access deactivated</h1>
          <p className="text-sm mb-4">
            Your access has been deactivated. Contact your administrator.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full bg-oryx-blue text-white rounded px-3 py-2"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
