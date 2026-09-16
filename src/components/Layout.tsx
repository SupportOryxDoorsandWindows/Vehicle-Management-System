import type { ReactNode } from 'react';
import { NavBar } from './NavBar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
