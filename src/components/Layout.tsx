import type { ReactNode } from 'react';
import { NavBar } from './NavBar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-oryx-ground lg:flex">
      <NavBar />
      <main className="flex-1 min-w-0 px-4 py-6 sm:px-9 sm:pt-7 sm:pb-12 print:p-0">
        <div className="max-w-[1240px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
