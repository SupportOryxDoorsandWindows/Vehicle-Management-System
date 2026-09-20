import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/unassigned-expenses', label: 'Unassigned Expenses' },
  { to: '/reports', label: 'Reports' },
];

export function NavBar() {
  const { profile, signOut } = useAuth();

  return (
    <nav className="bg-oryx-blue text-white px-6 py-4 flex gap-6 items-center">
      <span className="font-bold">Oryx Vehicle Management</span>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            isActive ? 'underline font-semibold' : 'opacity-80 hover:opacity-100'
          }
        >
          {link.label}
        </NavLink>
      ))}
      {profile?.role === 'admin' && (
        <NavLink
          to="/users"
          className={({ isActive }) =>
            isActive ? 'underline font-semibold' : 'opacity-80 hover:opacity-100'
          }
        >
          Manage Users
        </NavLink>
      )}
      <span className="ml-auto flex items-center gap-4 text-sm">
        {profile?.email}
        <button onClick={() => signOut()} className="underline opacity-80 hover:opacity-100">
          Log out
        </button>
      </span>
    </nav>
  );
}
