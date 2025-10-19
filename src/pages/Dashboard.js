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
    flagdownsToday: 0,
    activeOnline: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [fleetAlerts, setFleetAlerts] = useState([]);
  const [dispatchAlerts, setDispatchAlerts] = useState([]);
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
      const currentLocation = record.currentLocation || driver.currentLocation || vehicle.currentLocation || {};
      const updatedRaw =
        (currentLocation && currentLocation.updatedAt) ||
        record.updatedAt ||
        driver.updatedAt ||
        vehicle.updatedAt ||
        null;
      let lastReportedAt = null;
      if (updatedRaw) {
        const stamp = new Date(updatedRaw);
        if (!Number.isNaN(stamp.getTime())) {
          lastReportedAt = stamp.toISOString();
        }
      }
      return {
        ...record,
        status: record.status || record.currentStatus || 'Inactive',
        availability: record.availability || record.currentAvailability || 'Offline',
        firstName: record.firstName || driver.firstName || '',
        lastName: record.lastName || driver.lastName || '',
        driverId: record.driverId || driver.driverId || driver._id || '',
        cabNumber: record.cabNumber || vehicle.cabNumber || vehicle._id || '',
        lastReportedAt,
      };
    };

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      setDispatchAlerts([]);
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
        const flagdownsToday = bookings.filter((booking) => {
          if (!booking?.pickupTime) return false;
          const pickup = new Date(booking.pickupTime);
          if (Number.isNaN(pickup.getTime()) || pickup.toDateString() !== today.toDateString()) return false;
          return booking.dispatchMethod === 'flagdown' || booking.tripSource === 'driver';
        }).length;

        const upcomingBookings = bookings
          .filter((booking) => booking?.pickupTime)
          .sort((a, b) => new Date(a.pickupTime) - new Date(b.pickupTime))
          .slice(0, 4);

        const activeOnline = actives.filter(
          (item) => item.status === 'Active' && item.availability === 'Online',
        ).length;
        const alertsSlice = actives
          .filter((item) => item.status !== 'Active' || item.availability !== 'Online')
          .slice(0, 4);
        const pickupOrder = (value) => {
          if (!value) return Number.MAX_SAFE_INTEGER;
          const parsed = Date.parse(value);
          return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
        };
        const manualAlerts = bookings
          .filter((booking) => booking?.needs_reassignment)
          .sort((a, b) => pickupOrder(a?.pickupTime) - pickupOrder(b?.pickupTime));

        setMetrics({
          drivers: drivers.length,
          vehicles: vehicles.length,
          bookingsToday,
          flagdownsToday,
          activeOnline,
        });
        setRecentBookings(upcomingBookings);
        setFleetAlerts(alertsSlice);
        setDispatchAlerts(manualAlerts);

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
      {Array.from({ length: 6 }).map((_, index) => (
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
        <h3>Flagdowns today</h3>
        <div className="metric-value">{metrics.flagdownsToday}</div>
        <div className="metric-subline">
          <span className="dot" />
          Logged directly by drivers in the field
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
      <div className="metric-card">
        <h3>Base fare</h3>
        <div className="metric-value">
          {fare ? `$${Number(fare.farePerMile || 0).toFixed(2)}` : '--'}
        </div>
        <div className="metric-subline">
          <span className="dot" />
          {fare
            ? `Extra rider +$${Number(fare.extraPass || 0).toFixed(2)} · Wait $${Number(
                fare.waitTimePerMinute || 0,
              ).toFixed(2)}/min`
            : 'Configure fares to power pricing'}
        </div>
      </div>
    </div>
  );

  const renderBookingsTable = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '200px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!recentBookings.length) {
      return <div className="empty-state">No upcoming pickups in the next few hours.</div>;
    }

    return (
      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Pickup</th>
              <th>Customer</th>
              <th>Trip</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Cab</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((booking) => (
              <tr key={booking._id || booking.bookingId}>
                <td>{booking.pickupTime ? new Date(booking.pickupTime).toLocaleTimeString() : '-'}</td>
                <td>{booking.customerName || '-'}</td>
                <td>{booking.phoneNumber || '-'}</td>
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
      </div>
    );
  };

  const renderDispatchAlerts = () => {
    if (!dispatchAlerts.length) {
      return null;
    }

    const subset = dispatchAlerts.slice(0, 3);

    return (
      <div className="dispatch-alert-stack">
        {subset.map((booking) => {
          const pickup = booking?.pickupTime ? new Date(booking.pickupTime) : null;
          const pickupTime =
            pickup && !Number.isNaN(pickup.getTime()) ? pickup.toLocaleTimeString() : null;
          const pickupAddress = booking?.pickupAddress || null;
          const metaParts = [];
          if (pickupTime) metaParts.push(pickupTime);
          if (pickupAddress) metaParts.push(pickupAddress);
          const metaLine = metaParts.join(' - ') || 'Pickup details pending';
          const labelId =
            booking?.bookingId ||
            (booking?._id ? String(booking._id).slice(-6).padStart(6, '0') : '');
          const targetId = booking?._id || booking?.id || null;

          return (
            <div className="dispatch-alert-card" key={booking._id || booking.bookingId}>
              <div>
                <div className="title">{`Booking ${labelId}`.trim()}</div>
                <div className="meta">{metaLine}</div>
              </div>
              {targetId ? (
                <Link to={`/bookings/${targetId}`} className="btn btn-subtle">
                  Review
                </Link>
              ) : null}
            </div>
          );
        })}
        {dispatchAlerts.length > subset.length && (
          <div className="dispatch-alert-note">
            {dispatchAlerts.length - subset.length} more trip
            {dispatchAlerts.length - subset.length === 1 ? '' : 's'} waiting for manual assignment.
          </div>
        )}
      </div>
    );
  };

  const renderFleetAlerts = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '200px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!fleetAlerts.length) {
      if (dispatchAlerts.length) {
        return null;
      }
      return <div className="fleet-alert-empty">All active drivers are online and available.</div>;
    }

    return (
      <div className="fleet-alerts">
        {fleetAlerts.map((item) => {
          const driverName =
            [item.firstName, item.lastName].filter(Boolean).join(' ') || item.driverId || 'Unknown driver';
          const metaParts = [];
          if (item.cabNumber) {
            metaParts.push(`Cab #${item.cabNumber}`);
          } else {
            metaParts.push('Cab pending');
          }
          if (item.lastReportedAt) {
            const stamp = new Date(item.lastReportedAt);
            if (!Number.isNaN(stamp.getTime())) {
              metaParts.push(`Last ping ${stamp.toLocaleTimeString()}`);
            }
          }
          const metaLine = metaParts.join(' - ');

          return (
            <div className="fleet-alert-card" key={item._id || `${item.driverId}-${item.cabNumber}`}>
              <div className="alert-meta">
                <div className="name">{driverName}</div>
                <div className="cab">{metaLine || 'Awaiting activity update'}</div>
              </div>
              <div className="fleet-alert-status">
                <span className={`badge ${item.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {item.status || 'Inactive'}
                </span>
                <span className={`badge ${item.availability === 'Online' ? 'badge-info' : 'badge-warning'}`}>
                  {item.availability || 'Offline'}
                </span>
              </div>
            </div>
          );
        })}
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

      <div className="grid-two responsive-cards">
        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming pickups</h3>
            <Link to="/bookings" className="btn btn-subtle">View bookings</Link>
          </div>
          <p className="panel-subtitle">Next four rides queued on the board.</p>
          {renderBookingsTable()}
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Dispatch alerts</h3>
            <Link to="/bookings/new" className="btn btn-subtle">Open booking map</Link>
          </div>
          <p className="panel-subtitle">Drivers needing attention and trips waiting for manual assignment.</p>
          {renderDispatchAlerts()}
          {renderFleetAlerts()}
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




