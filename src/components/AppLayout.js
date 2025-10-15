import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Icon = ({ children }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const icons = {
  dashboard: (
    <Icon>
      <path d="M4 4h7v10H4z" />
      <path d="M13 10h7V4h-7z" />
      <path d="M13 20h7v-8h-7z" />
      <path d="M4 20h7v-5H4z" />
    </Icon>
  ),
  drivers: (
    <Icon>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M3 20a7 7 0 0 1 18 0Z" />
    </Icon>
  ),
  vehicles: (
    <Icon>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 17v2" />
      <path d="M17 17v2" />
      <path d="M3 11h18" />
    </Icon>
  ),
  actives: (
    <Icon>
      <path d="M4 18c2-2.5 4-4 8-4s6 1.5 8 4" />
      <circle cx="12" cy="7" r="3.5" />
    </Icon>
  ),
  bookings: (
    <Icon>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M6 10h12" />
    </Icon>
  ),
  fares: (
    <Icon>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v8" />
      <path d="M15 9h-3a2 2 0 0 0 0 4h0a2 2 0 0 1 0 4h-3" />
    </Icon>
  ),
  create: (
    <Icon>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M10 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2" />
      <path d="m15 12-8 0" />
      <path d="m7 9-3 3 3 3" />
    </Icon>
  ),
  menu: (
    <Icon>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Icon>
  ),
};

const navLinks = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard },
  { to: '/drivers', label: 'Drivers', icon: icons.drivers },
  { to: '/drivers/new', label: 'Add Driver', icon: icons.create },
  { to: '/vehicles', label: 'Vehicles', icon: icons.vehicles },
  { to: '/vehicles/new', label: 'Add Vehicle', icon: icons.create },
  { to: '/actives', label: 'Active Roster', icon: icons.actives },
  { to: '/bookings', label: 'Bookings', icon: icons.bookings },
  { to: '/bookings/new', label: 'Add Booking', icon: icons.create },
  { to: '/fares', label: 'Fare Settings', icon: icons.fares },
];

const AppLayout = ({ title, subtitle, actions, children }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="logo-circle">TO</div>
          <div className="brand-text">
            <span className="app-name">TaxiOps</span>
            <span className="app-tagline">Control Center</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
              end={item.to === '/'}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" onClick={logout}>
            {icons.logout}
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} role="presentation" />}

      <div className="app-content">
        <header className="app-header">
          <button
            type="button"
            className="header-menu"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            {icons.menu}
          </button>
          <div className="header-titles">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="header-actions">{actions}</div>}
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
