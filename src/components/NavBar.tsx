import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/unassigned-expenses', label: 'Unassigned Expenses' },
  { to: '/reports', label: 'Reports' },
];

export function NavBar() {
  return (
    <nav className="bg-oryx-blue text-white px-6 py-4 flex gap-6">
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
    </nav>
  );
}
