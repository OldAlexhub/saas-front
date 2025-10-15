import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { listActives } from '../services/activeService';
import { listBookings } from '../services/bookingService';
import { listDrivers } from '../services/driverService';
import { getFare } from '../services/fareService';
import { listVehicles } from '../services/vehicleService';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    drivers: 0,
    vehicles: 0,
    bookingsToday: 0,
    activeOnline: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [activeRoster, setActiveRoster] = useState([]);
  const [fare, setFare] = useState(null);

  useEffect(() => {
    const unwrapArray = (response, preferredKeys = []) => {
      const payload = response?.data ?? response ?? {};
      if (Array.isArray(payload)) return payload;
      for (const key of preferredKeys) {
        const value = payload?.[key];
        if (Array.isArray(value)) return value;
      }
      if (Array.isArray(payload?.data)) return payload.data;
      const firstArray = Object.values(payload).find((value) => Array.isArray(value));
      return Array.isArray(firstArray) ? firstArray : [];
    };

    const normalizeActive = (record) => {
      if (!record || typeof record !== 'object') return null;
      const driver = record.driver || record.driverInfo || {};
      const vehicle = record.vehicle || record.vehicleInfo || {};
      return {
        ...record,
        status: record.status || record.currentStatus || 'Inactive',
        availability: record.availability || record.currentAvailability || 'Offline',
        firstName: record.firstName || driver.firstName || '',
        lastName: record.lastName || driver.lastName || '',
        driverId: record.driverId || driver.driverId || driver._id || '',
        cabNumber: record.cabNumber || vehicle.cabNumber || vehicle._id || '',
      };
    };

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [driversRes, vehiclesRes, bookingsRes, activesRes, fareRes] = await Promise.all([
          listDrivers(),
          listVehicles(),
          listBookings({ limit: 50 }),
          listActives(),
          getFare().catch(() => ({ data: null })),
        ]);

        const drivers = unwrapArray(driversRes, ['drivers', 'list', 'results']);
        const vehicles = unwrapArray(vehiclesRes, ['vehicles', 'list', 'results']);
        const bookings = unwrapArray(bookingsRes, ['bookings', 'results']);
        const activesRaw = unwrapArray(activesRes, ['data', 'actives', 'results']);
        const actives = activesRaw.map((item) => normalizeActive(item)).filter(Boolean);

        const today = new Date();
        const bookingsToday = bookings.filter((booking) => {
          if (!booking?.pickupTime) return false;
          const pickup = new Date(booking.pickupTime);
          return !Number.isNaN(pickup.getTime()) && pickup.toDateString() === today.toDateString();
        }).length;

        const upcomingBookings = bookings
          .filter((booking) => booking?.pickupTime)
          .sort((a, b) => new Date(a.pickupTime) - new Date(b.pickupTime))
          .slice(0, 6);

        const activeOnline = actives.filter(
          (item) => item.status === 'Active' && item.availability === 'Online',
        ).length;
        const rosterSlice = actives
          .slice()
          .sort((a, b) => {
            if (a.status === b.status) {
              return a.firstName?.localeCompare(b.firstName || '') || 0;
            }
            return a.status === 'Active' ? -1 : 1;
          })
          .slice(0, 6);

        setMetrics({
          drivers: drivers.length,
          vehicles: vehicles.length,
          bookingsToday,
          activeOnline,
        });
        setRecentBookings(upcomingBookings);
        setActiveRoster(rosterSlice);

        const farePayload = fareRes?.data?.fare || fareRes?.data?.currentFare || fareRes?.data?.data || null;
        setFare(farePayload && !Array.isArray(farePayload) ? farePayload : null);
      } catch (err) {
        const message = err.response?.data?.message || 'Unable to load dashboard data right now.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const headerActions = useMemo(
    () => (
      <>
        <Link to="/bookings/new" className="btn btn-primary">
          <span className="icon">＋</span>
          New booking
        </Link>
        <Link to="/actives" className="btn btn-ghost">
          <span className="icon">◎</span>
          Active roster
        </Link>
      </>
    ),
    []
  );

  const renderMetricSkeletons = () => (
    <div className="metrics-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="metric-card skeleton" style={{ height: '140px' }} />
      ))}
    </div>
  );

  const renderMetrics = () => (
    <div className="metrics-grid">
      <div className="metric-card">
        <h3>Total drivers</h3>
        <div className="metric-value">{metrics.drivers}</div>
        <div className="metric-subline">
          <span className="dot" />
          Rostered professionals ready to drive
        </div>
      </div>
      <div className="metric-card">
        <h3>Fleet vehicles</h3>
        <div className="metric-value">{metrics.vehicles}</div>
        <div className="metric-subline">
          <span className="dot" />
          Verified and inspection-ready assets
        </div>
      </div>
      <div className="metric-card">
        <h3>Pickups today</h3>
        <div className="metric-value">{metrics.bookingsToday}</div>
        <div className="metric-subline">
          <span className="dot" />
          Scheduled trips for the current day
        </div>
      </div>
      <div className="metric-card">
        <h3>Online actives</h3>
        <div className="metric-value">{metrics.activeOnline}</div>
        <div className="metric-subline">
          <span className="dot" />
          Drivers actively accepting rides
        </div>
      </div>
    </div>
  );

  const renderBookingsTable = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '220px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!recentBookings.length) {
      return <div className="empty-state">No upcoming bookings found. Create one to get started.</div>;
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Pickup</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Cab</th>
          </tr>
        </thead>
        <tbody>
          {recentBookings.map((booking) => (
            <tr key={booking._id || booking.bookingId}>
              <td>{booking.pickupTime ? new Date(booking.pickupTime).toLocaleString() : '—'}</td>
              <td>{booking.customerName || '—'}</td>
              <td>{booking.phoneNumber || '—'}</td>
              <td>
                <span className={`badge ${booking.status === 'Completed' ? 'badge-success' : booking.status === 'Cancelled' ? 'badge-warning' : 'badge-info'}`}>
                  {booking.status || 'Scheduled'}
                </span>
              </td>
              <td>{booking.cabNumber || booking.assignedCab || 'Unassigned'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderActiveRoster = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '220px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!activeRoster.length) {
      return <div className="empty-state">No drivers are marked active yet.</div>;
    }

    return (
      <div className="roster-list">
        {activeRoster.map((item, index) => (
          <div
            key={item._id || `${item.driverId}-${item.cabNumber}` || `roster-${index}`}
            className="roster-item"
          >
            <div className="roster-primary">
              <div className="roster-name">{item.firstName} {item.lastName}</div>
              <div className="roster-meta">
                <span className={`badge ${item.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span>
                <span className={`badge ${item.availability === 'Online' ? 'badge-info' : 'badge-warning'}`}>
                  {item.availability || 'Offline'}
                </span>
              </div>
            </div>
            <div className="roster-secondary">
              <span>Cab #{item.cabNumber || '—'}</span>
              <span>ID: {item.driverId || '—'}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout
      title="Operations dashboard"
      subtitle="Monitor bookings, fleet readiness and fare controls in one glance."
      actions={headerActions}
    >
      {loading ? renderMetricSkeletons() : renderMetrics()}

      <div className="grid-two">
        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming pickups</h3>
            <Link to="/bookings" className="btn btn-subtle">View bookings</Link>
          </div>
          <p className="panel-subtitle">Live look at the next scheduled rides.</p>
          {renderBookingsTable()}
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Active fleet snapshot</h3>
            <Link to="/actives" className="btn btn-subtle">Manage roster</Link>
          </div>
          <p className="panel-subtitle">Quick insight into drivers currently in service.</p>
          {renderActiveRoster()}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '32px' }}>
        <div className="panel-header">
          <h3>Fare configuration</h3>
          <Link to="/fares" className="btn btn-subtle">Update fares</Link>
        </div>
        {fare ? (
          <div className="fare-grid">
            <div>
              <h4>Fare per mile</h4>
              <p>${Number(fare.farePerMile || 0).toFixed(2)}</p>
            </div>
            <div>
              <h4>Extra passenger</h4>
              <p>{fare.extraPass ? `$${Number(fare.extraPass).toFixed(2)}` : 'Not configured'}</p>
            </div>
            <div>
              <h4>Wait time / minute</h4>
              <p>${Number(fare.waitTimePerMinute || 0).toFixed(2)}</p>
            </div>
            <div className="notice">
              Keep fares aligned with city policy. Update settings whenever regulations change to ensure accurate billing.
            </div>
            {fare.updatedAt && (
              <div className="fare-updated">Last updated {new Date(fare.updatedAt).toLocaleString()}</div>
            )}
          </div>
        ) : loading ? (
          <div className="skeleton" style={{ height: '120px' }} />
        ) : (
          <div className="empty-state">No fare settings yet. Create your base fare structure to start billing.</div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;