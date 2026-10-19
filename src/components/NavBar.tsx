import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { countVehicles } from '../api/vehicles';
import { countUnassignedExpenses } from '../api/expenses';
import { useLoad } from '../lib/useLoad';
import { NavIcon, type NavIconName } from './NavIcons';

interface NavItem {
  to: string;
  label: string;
  icon: NavIconName;
  end?: boolean;
  count?: 'vehicles' | 'unassigned';
}

interface NavGroup {
  title: string;
  adminOnly?: boolean;
  items: (NavItem & { adminOnly?: boolean })[];
}

const GROUPS: NavGroup[] = [
  {
    title: 'Fleet',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/vehicles', label: 'Vehicles', icon: 'vehicles', count: 'vehicles' },
      { to: '/unassigned-expenses', label: 'To assign', icon: 'assign', count: 'unassigned' },
    ],
  },
  {
    title: 'Insight',
    items: [
      { to: '/reports', label: 'Reports', icon: 'reports' },
      { to: '/history', label: 'History', icon: 'history', adminOnly: true },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { to: '/users', label: 'Users', icon: 'users' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

function initials(email: string | undefined): string {
  const name = (email ?? '').split('@')[0];
  const words = name.split(/[._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase() || '?';
}

export function NavBar() {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  // Counts are a convenience: refresh them on each page change, and hide them if they fail.
  const { data: counts } = useLoad(
    () =>
      Promise.all([countVehicles().catch(() => null), countUnassignedExpenses().catch(() => null)]).then(
        ([vehicles, unassigned]) => ({ vehicles, unassigned })
      ),
    [pathname]
  );

  return (
    <nav
      aria-label="Main"
      className="bg-oryx-blue text-oryx-tint print:hidden lg:w-[232px] lg:flex-none lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-7 px-3.5 py-4 lg:py-[22px] lg:h-full">
        <div className="flex items-center gap-2.5 px-2.5">
          <div className="w-[30px] h-[30px] rounded-md bg-oryx-tint text-oryx-blue flex items-center justify-center font-bold text-[15px]">
            O
          </div>
          <div>
            <div className="font-bold tracking-[0.08em] text-sm">ORYX</div>
            <div className="text-xs text-oryx-nav-muted">Fleet</div>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="main-nav-links"
            onClick={() => setOpen(!open)}
            className="ml-auto lg:hidden inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-oryx-nav-line text-white"
          >
            <NavIcon name="menu" />
            Menu
          </button>
        </div>

        <div id="main-nav-links" className={`${open ? 'flex' : 'hidden'} lg:flex flex-col gap-7 lg:flex-1`}>
          {GROUPS.filter((g) => !g.adminOnly || isAdmin).map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <div className="text-[11px] tracking-[0.08em] uppercase text-oryx-nav-muted px-2.5 pb-1.5">
                {group.title}
              </div>
              {group.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const count = item.count ? counts?.[item.count] : null;
                  const showCount = count != null && count > 0;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      aria-label={showCount ? `${item.label} (${count})` : undefined}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-[9px] rounded-md no-underline ${
                          isActive ? 'bg-oryx-nav-active text-white font-medium' : 'text-oryx-nav-text hover:text-white'
                        }`
                      }
                    >
                      <NavIcon name={item.icon} />
                      {item.label}
                      {showCount && (
                        <span
                          className={
                            item.count === 'unassigned'
                              ? 'ml-auto text-xs font-semibold bg-[#F2C46B] text-[#3D2600] rounded-full px-2 py-px'
                              : 'ml-auto text-xs text-oryx-nav-text'
                          }
                        >
                          {count}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
            </div>
          ))}

          <div className="mt-auto flex items-center gap-2.5 px-2.5 pt-3 border-t border-oryx-nav-line">
            <div
              aria-hidden="true"
              className="w-8 h-8 flex-none rounded-full bg-oryx-nav-line text-white flex items-center justify-center text-xs font-semibold"
            >
              {initials(profile?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-white truncate">{profile?.email}</div>
              <div className="text-xs text-oryx-nav-muted">{isAdmin ? 'Admin' : 'Viewer'}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs text-oryx-nav-text underline hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
