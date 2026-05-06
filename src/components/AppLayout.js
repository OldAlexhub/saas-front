import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useRealtime } from '../providers/RealtimeProvider';
import API from '../services/api';

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
  admins: (
    <Icon>
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
      <path d="M3 22a9 9 0 0 1 18 0" />
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
  reports: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h6" />
      <path d="M7 16h8" />
    </Icon>
  ),
  // accounting icon removed
  messaging: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      <path d="M12 11h6" />
      <path d="M8 8h10" />
      <path d="M8 14h3" />
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
  enrollme: (
    <Icon>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </Icon>
  ),
  accidents: (
    <Icon>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  ),
  download: (
    <Icon>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  ),
  nemt: (
    <Icon>
      <rect x="3" y="11" width="18" height="8" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path d="M12 15v2" />
      <path d="M9 15h6" />
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

const navSections = [
  {
    id: 'dashboard',
    type: 'link',
    to: '/',
    label: 'Dashboard',
    icon: icons.dashboard,
    end: true,
  },
  {
    id: 'operations',
    type: 'group',
    label: 'Operations',
    icon: icons.admins,
    items: [
      { to: '/admins', label: 'Admin approvals', icon: icons.admins },
      { to: '/actives', label: 'Active Roster', icon: icons.actives },
      { to: '/enrollme-admins', label: 'EnrollMe Admins', icon: icons.enrollme },
    ],
  },
  {
    id: 'bookings',
    type: 'group',
    label: 'Bookings',
    icon: icons.bookings,
    items: [
      { to: '/bookings', label: 'Bookings', icon: icons.bookings },
      { to: '/bookings/new', label: 'Add Booking', icon: icons.create, end: true },
    ],
  },
  {
    id: 'drivers',
    type: 'group',
    label: 'Driver management',
    icon: icons.drivers,
    items: [
      { to: '/drivers', label: 'Drivers', icon: icons.drivers },
      { to: '/drivers/new', label: 'Add Driver', icon: icons.create, end: true },
      { to: '/settings/messaging', label: 'Driver messaging', icon: icons.messaging, end: true },
    ],
  },
  {
    id: 'vehicles',
    type: 'group',
    label: 'Vehicle management',
    icon: icons.vehicles,
    items: [
      { to: '/vehicles', label: 'Vehicles', icon: icons.vehicles },
      { to: '/vehicles/new', label: 'Add Vehicle', icon: icons.create, end: true },
    ],
  },
  {
    id: 'reports',
    type: 'group',
    label: 'Reports',
    icon: icons.reports,
    items: [
      { to: '/reports/builder', label: 'Report Designer', icon: icons.reports, end: true },
      { to: '/reports/receipts', label: 'Generate Receipts', icon: icons.reports, end: true },
      { to: '/reports/diagnostics', label: 'Diagnostics', icon: icons.reports, end: true },
      { to: '/accidents', label: 'Accident Reports', icon: icons.accidents, end: true },
    ],
  },
  {
    id: 'nemt',
    type: 'group',
    label: 'NEMT',
    icon: icons.nemt,
    items: [
      { to: '/nemt/trips', label: 'Trips', icon: icons.nemt },
      { to: '/nemt/trips/new', label: 'Add Trip', icon: icons.create, end: true },
      { to: '/nemt/runs', label: 'Runs', icon: icons.nemt },
      { to: '/nemt/runs/new', label: 'New Run', icon: icons.create, end: true },
      { to: '/nemt/agencies', label: 'Agencies', icon: icons.nemt, end: true },
      { to: '/nemt/pay', label: 'Pay & Billing', icon: icons.fares, end: true },
      { to: '/nemt/reports', label: 'Reports', icon: icons.reports, end: true },
      { to: '/nemt/live', label: 'Live View', icon: icons.nemt, end: true },
      { to: '/nemt/settings', label: 'NEMT Settings', icon: icons.fares, end: true },
    ],
  },
  {
    id: 'settings',
    type: 'group',
    label: 'Settings',
    icon: icons.fares,
    items: [
      { to: '/fares', label: 'Fares', icon: icons.fares },
      { to: '/settings/app', label: 'Driver App Settings', icon: icons.fares, end: true },
      { to: '/settings/company', label: 'Company Settings', icon: icons.fares, end: true },
      { to: '/settings/driver-app', label: 'Driver App Download', icon: icons.download, end: true },
      // Invoicing removed
    ],
  },
];

const isPathMatch = (item, pathname) => {
  if (!item?.to) return false;
  if (item.end) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
};

const AppLayout = ({ title, subtitle, actions, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    navSections.forEach((section) => {
      if (section.type === 'group') {
        initial[section.id] = section.items.some((item) => isPathMatch(item, location.pathname));
      }
    });
    return initial;
  });
  const { socket, connected } = useRealtime();
  const [notifications, setNotifications] = useState([]);
  const connectionStateRef = useRef(false);

  const toggleGroup = useCallback((id) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      navSections.forEach((section) => {
        if (section.type !== 'group') return;
        if (section.items.some((item) => isPathMatch(item, location.pathname)) && !next[section.id]) {
          next[section.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [location.pathname]);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const pushNotification = useCallback(
    (message, tone = 'info') => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => {
        const next = [...prev, { id, message, tone }];
        if (next.length > 4) next.shift();
        return next;
      });
      window.setTimeout(() => dismissNotification(id), 8000);
    },
    [dismissNotification],
  );

  useEffect(() => {
    // Allow other parts of the app to push notifications via a window event
    const handler = (ev) => {
      try {
        const detail = ev?.detail;
        if (!detail) return;
        const { message, tone } = detail;
        if (!message) return;
        pushNotification(message, tone || 'info');
      } catch (e) {
        // ignore malformed events
      }
    };
    window.addEventListener('taxiops:pushNotification', handler);
    return () => window.removeEventListener('taxiops:pushNotification', handler);
  }, [pushNotification]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleAssignmentUpdate = (payload = {}) => {
      const { event, booking } = payload;
      const bookingLabel = booking?.bookingId ? `Trip #${booking.bookingId}` : 'Trip';
      switch (event) {
        case 'assigned':
          pushNotification(`${bookingLabel} assigned to ${booking?.driverId || 'a driver'}.`, 'info');
          break;
        case 'declined':
          pushNotification(`${booking?.driverId || 'Driver'} declined ${bookingLabel}.`, 'warning');
          break;
        case 'status':
          pushNotification(
            `${booking?.driverId || 'Driver'} marked ${bookingLabel} as ${booking?.status || 'updated'}.`,
            booking?.status === 'Completed' ? 'success' : booking?.status === 'Cancelled' ? 'warning' : 'info',
          );
          break;
        case 'flagdown':
          pushNotification(`${booking?.driverId || 'Driver'} captured a flagdown ride.`, 'info');
          break;
        default:
          pushNotification(`Dispatch update received for ${bookingLabel}.`, 'info');
      }
    };

    const handleMessageScheduled = (payload = {}) => {
      const title = payload?.message?.title || 'Driver message';
      pushNotification(`Scheduled "${title}" for drivers.`, 'info');
    };

    const handleMessageCancelled = (payload = {}) => {
      const title = payload?.message?.title || 'Driver message';
      pushNotification(`Cancelled "${title}".`, 'warning');
    };

    const handleNemtRunDispatched = (payload = {}) => {
      pushNotification(`NEMT run ${payload.runId || ''} dispatched to driver ${payload.driverId || ''}.`, 'info');
    };

    const handleNemtRunAcknowledged = (payload = {}) => {
      pushNotification(`NEMT run ${payload.runId || ''} acknowledged by driver ${payload.driverId || ''}.`, 'info');
    };

    const handleNemtRunStarted = (payload = {}) => {
      pushNotification(`NEMT run ${payload.runId || ''} is now active.`, 'info');
    };

    const handleNemtRunCompleted = (payload = {}) => {
      pushNotification(`NEMT run ${payload.runId || ''} completed.`, 'success');
    };

    const handleNemtTripStatus = (payload = {}) => {
      pushNotification(
        `NEMT trip #${payload.tripId || ''} → ${payload.status || 'updated'}.`,
        payload.status === 'Completed' ? 'success' : 'info',
      );
    };

    const handleNemtTripCancelled = (payload = {}) => {
      pushNotification(`NEMT trip #${payload.tripId || ''} cancelled.`, 'warning');
    };

    socket.on('assignment:updated', handleAssignmentUpdate);
    socket.on('message:scheduled', handleMessageScheduled);
    socket.on('message:cancelled', handleMessageCancelled);
    socket.on('nemt:run-dispatched', handleNemtRunDispatched);
    socket.on('nemt:run-acknowledged', handleNemtRunAcknowledged);
    socket.on('nemt:run-started', handleNemtRunStarted);
    socket.on('nemt:run-completed', handleNemtRunCompleted);
    socket.on('nemt:trip-status', handleNemtTripStatus);
    socket.on('nemt:trip-cancelled', handleNemtTripCancelled);

    return () => {
      socket.off('assignment:updated', handleAssignmentUpdate);
      socket.off('message:scheduled', handleMessageScheduled);
      socket.off('message:cancelled', handleMessageCancelled);
      socket.off('nemt:run-dispatched', handleNemtRunDispatched);
      socket.off('nemt:run-acknowledged', handleNemtRunAcknowledged);
      socket.off('nemt:run-started', handleNemtRunStarted);
      socket.off('nemt:run-completed', handleNemtRunCompleted);
      socket.off('nemt:trip-status', handleNemtTripStatus);
      socket.off('nemt:trip-cancelled', handleNemtTripCancelled);
    };
  }, [socket, pushNotification]);

  useEffect(() => {
    if (!socket) return;
    if (connected && !connectionStateRef.current) {
      connectionStateRef.current = true;
      pushNotification('Realtime updates connected.', 'success');
    } else if (!connected && connectionStateRef.current) {
      connectionStateRef.current = false;
      pushNotification('Realtime connection lost. Attempting to reconnect…', 'warning');
    }
  }, [connected, socket, pushNotification]);

  const logout = async () => {
    try {
      await API.post('/admins/logout');
    } catch (_) {
      // best-effort; clear local state regardless
    }
    localStorage.removeItem('isLoggedIn');
    window.dispatchEvent(new Event('auth-token'));
    navigate('/login');
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {notifications.length > 0 && (
        <div className="realtime-toast-container">
          {notifications.map((note) => (
            <div key={note.id} className={`realtime-toast realtime-toast--${note.tone}`}>
              <span>{note.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissNotification(note.id)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="logo-circle">TO</div>
          <div className="brand-text">
            <span className="app-name">TaxiOps</span>
            <span className="app-tagline">Control Center</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((section) => {
            if (section.type === 'link') {
              return (
                <NavLink
                  key={section.id}
                  to={section.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                  end={section.end ?? section.to === '/'}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </NavLink>
              );
            }

            const expanded = !!openGroups[section.id];
            const sectionActive = section.items.some((item) => isPathMatch(item, location.pathname));
            const subnavId = `sidebar-subnav-${section.id}`;

            return (
              <div key={section.id} className={`sidebar-group ${expanded ? 'open' : ''}`}>
                <button
                  type="button"
                  className={`sidebar-group-toggle ${sectionActive ? 'active' : ''}`}
                  onClick={() => toggleGroup(section.id)}
                  aria-expanded={expanded}
                  aria-controls={subnavId}
                >
                  {section.icon}
                  <span>{section.label}</span>
                  <span className="sidebar-group-arrow" aria-hidden="true">
                    {expanded ? '▾' : '▸'}
                  </span>
                </button>
                <div id={subnavId} className="sidebar-subnav" hidden={!expanded}>
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `sidebar-link sidebar-subnav-link ${isActive ? 'active' : ''}`
                      }
                      onClick={closeSidebar}
                      end={item.end}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
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
          <footer className="app-footer">
            <div className="app-footer-inner">© {new Date().getFullYear()} Developed and owned by Old Alex Hub, a Florida, USA LLC</div>
          </footer>
      </div>
    </div>
  );
};

export default AppLayout;
