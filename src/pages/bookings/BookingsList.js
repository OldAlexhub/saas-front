import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listBookings } from '../../services/bookingService';

const statusOptions = ['All', 'Scheduled', 'Assigned', 'Completed', 'Cancelled'];

const todayIso = new Date().toISOString().slice(0, 10);

const BookingsList = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  // appliedDates drives the query — only updated when Apply is clicked
  const [appliedDates, setAppliedDates] = useState({
    from: new Date(`${todayIso}T00:00:00`).toISOString(),
    to: new Date(`${todayIso}T23:59:59.999`).toISOString(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', appliedDates],
    queryFn: async () => {
      const params = {};
      if (appliedDates.from) params.from = appliedDates.from;
      if (appliedDates.to) params.to = appliedDates.to;
      const res = await listBookings(params);
      const items = res.data?.bookings || res.data?.results || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const bookings = data ?? [];

  const applyDates = () => {
    setAppliedDates({
      from: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
      to: toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined,
    });
  };

  const clearDates = () => {
    setFromDate('');
    setToDate('');
    setAppliedDates({ from: undefined, to: undefined });
  };

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = status === 'All' || booking.status === status;
      if (!matchesStatus) return false;
      if (!query) return true;
      const target = [
        booking.customerName,
        booking.phoneNumber,
        booking.bookingId,
        booking.cabNumber,
        booking.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(query);
    });
  }, [bookings, search, status]);

  const actions = (
    <Link to="/bookings/new" className="btn btn-primary">
      <span className="icon">＋</span>
      New booking
    </Link>
  );

  const renderBody = () => {
    if (isLoading) {
      return <div className="skeleton" style={{ height: '260px' }} />;
    }
    if (error) {
      const msg = error.response?.data?.message || 'Failed to fetch bookings';
      return <div className="feedback error">{msg}</div>;
    }
    if (!filteredBookings.length) {
      return <div className="empty-state">No bookings match your filters yet.</div>;
    }

    return (
      <div className="table-responsive-stack">
        <table className="data-table">
        <thead>
          <tr>
            <th>Booking</th>
            <th>Customer</th>
            <th>Pickup</th>
            <th>Status</th>
            <th>Assignment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBookings.map((booking) => (
            <tr key={booking._id || booking.bookingId}>
              <td data-label="Booking">
                <div className="table-stack">
                  <span className="primary">#{booking.bookingId || booking._id?.slice(-6)}</span>
                  <span className="secondary">Created {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '—'}</span>
                </div>
              </td>
              <td data-label="Customer">
                <div className="table-stack">
                  <span className="primary">{booking.customerName || '—'}</span>
                  <span className="secondary">{booking.phoneNumber || 'No phone on file'}</span>
                </div>
              </td>
              <td data-label="Pickup">
                <div className="table-stack">
                  <span className="primary">{booking.pickupTime ? new Date(booking.pickupTime).toLocaleString() : '—'}</span>
                  <span className="secondary">Pickup: {booking.pickupAddress || 'TBD'}</span>
                </div>
              </td>
              <td data-label="Status">
                <span className={`badge ${booking.status === 'Completed' ? 'badge-success' : booking.status === 'Cancelled' ? 'badge-warning' : 'badge-info'}`}>
                  {booking.status || 'Scheduled'}
                </span>
              </td>
              <td data-label="Assignment">
                <div className="table-stack">
                  <span className="primary">Driver: {booking.driverName || booking.driverId || 'Unassigned'}</span>
                  <span className="secondary">Cab #{booking.cabNumber || booking.assignedCab || '—'}</span>
                </div>
              </td>
              <td data-label="Actions">
                {booking._id ? (
                  <Link className="pill-button" to={`/bookings/${booking._id}`}>
                    Manage
                  </Link>
                ) : (
                  <span className="secondary">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    );
  };

  return (
    <AppLayout
      title="Booking pipeline"
      subtitle="Track every reservation, from scheduled pickups to completed trips."
      actions={actions}
    >
      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by customer, phone, cab or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="search-input" style={{ width: 160 }}>
                <span className="icon">📅</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="search-input" style={{ width: 160 }}>
                <span className="icon">📅</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-subtle" type="button" onClick={applyDates}>Apply</button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={clearDates}
            >
              Clear
            </button>
          </div>

          <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="summary">{filteredBookings.length} of {bookings.length} bookings</div>
        </div>
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default BookingsList;