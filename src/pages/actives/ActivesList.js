import { useEffect, useState } from 'react';
import {
  listActives,
  updateAvailability,
  updateStatus,
} from '../../services/activeService';
const splitDriverName = (driver) => {
  const rawName = pickFirst(driver?.name, driver?.fullName);
  if (!rawName) return { first: '', last: '' };
  const parts = String(rawName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  const [first, ...rest] = parts;
  return { first, last: rest.join(' ') };
};

const normalizeActiveRecord = (record) => {
  if (!record || typeof record !== 'object') return null;

  const driver = record.driver || record.driverInfo || record.driverDetails || record.driverProfile || {};
  const vehicle = record.vehicle || record.vehicleInfo || record.vehicleDetails || record.cab || {};
  const { first: derivedFirst, last: derivedLast } = splitDriverName(driver);

  const normalized = {
    ...record,
    driverId: pickFirst(record.driverId, driver.driverId, driver._id, driver.id),
    firstName: pickFirst(record.firstName, driver.firstName, driver.givenName, derivedFirst),
    lastName: pickFirst(record.lastName, driver.lastName, driver.familyName, derivedLast),
    cabNumber: pickFirst(record.cabNumber, vehicle.cabNumber, vehicle._id, vehicle.id),
    licPlates: pickFirst(record.licPlates, vehicle.licPlates, vehicle.licensePlate, vehicle.plate, vehicle.plates),
    make: pickFirst(record.make, vehicle.make, vehicle.vehicleMake),
    model: pickFirst(record.model, vehicle.model, vehicle.vehicleModel),
    color: pickFirst(record.color, vehicle.color, vehicle.vehicleColor),
    status: pickFirst(record.status, record.currentStatus, record.state, 'Inactive'),
    availability: pickFirst(
      record.availability,
      record.currentAvailability,
      record.availabilityStatus,
      'Offline',
    ),
    currentLocation:
      record.currentLocation ||
      record.location ||
      driver.currentLocation ||
      vehicle.currentLocation ||
      undefined,
  };

  return normalized;
};

const ActivesList = () => {
  const [actives, setActives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchActives = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await listActives();
      const payload =
        res.data?.data ||
        res.data?.actives ||
        res.data?.results ||
        res.data ||
        [];
      const normalized = (Array.isArray(payload) ? payload : [])
        .map((item) => normalizeActiveRecord(item))
        .filter(Boolean);
      setActives(normalized);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch actives';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActives();
  }, [fetchActives]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return actives;
    return actives.filter((item) => {
      const target = [
        item.firstName,
        item.lastName,
        item.cabNumber,
        item.driverId,
        item.licPlates,
        item.make,
        item.model,
        item.color,
        item.status,
        item.availability,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(query);
    });
  }, [actives, search]);

  const toggleStatus = async (id, current) => {
    const nextStatus = current === 'Active' ? 'Inactive' : 'Active';
    setUpdating(id + '-status');
    try {
      await updateStatus(id, nextStatus);
      setActives((prev) => prev.map((item) => (item._id === id ? { ...item, status: nextStatus } : item)));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update status';
      setError(msg);
    } finally {
      setUpdating('');
    }
  };

  const toggleAvailability = async (id, current) => {
    const nextAvailability = current === 'Online' ? 'Offline' : 'Online';
    setUpdating(id + '-availability');
    try {
      await updateAvailability(id, nextAvailability);
      setActives((prev) => prev.map((item) => (item._id === id ? { ...item, availability: nextAvailability } : item)));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update availability';
      setError(msg);
    } finally {
      setUpdating('');
    }
  };

  const headerActions = (
    <div className="action-stack">
      <button type="button" className="btn btn-ghost" onClick={fetchActives} disabled={refreshing}>
        {refreshing ? 'Refreshing…' : 'Refresh roster'}
      </button>
      <Link to="/actives/new" className="btn btn-primary">
        <span className="icon">＋</span>
        Activate driver
      </Link>
    </div>
  );

  const renderBody = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '240px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!filtered.length) {
      return <div className="empty-state">No actives match this search.</div>;
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>Cab</th>
            <th>Status</th>
            <th>Availability</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((active) => {
            const lastPing = active.currentLocation?.updatedAt || active.updatedAt || active.createdAt;
            const driverLabel = [active.firstName, active.lastName].filter(Boolean).join(' ') ||
              pickFirst(active.driver?.name, active.driver?.fullName, active.driver?.email, '—');
            return (
              <tr key={active._id || `${active.driverId}-${active.cabNumber}`}>
                <td>
                  <div className="table-stack">
                    <span className="primary">{driverLabel}</span>
                    <span className="secondary">ID: {active.driverId || '—'}</span>
                  </div>
                </td>
                <td>
                  <div className="table-stack">
                    <span className="primary">Cab #{active.cabNumber || '—'}</span>
                    <span className="secondary">
                      Last ping: {lastPing ? new Date(lastPing).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${active.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                    {active.status || 'Inactive'}
                </span>
              </td>
              <td>
                <span className={`badge ${active.availability === 'Online' ? 'badge-info' : 'badge-warning'}`}>
                  {active.availability || 'Offline'}
                </span>
              </td>
              <td>
                <div className="pill-group">
                  <Link className="pill-button" to={`/actives/${active._id}`}>
                    Manage
                  </Link>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => toggleStatus(active._id, active.status)}
                    disabled={updating === active._id + '-status'}
                  >
                    Toggle status
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => toggleAvailability(active._id, active.availability)}
                    disabled={updating === active._id + '-availability'}
                  >
                    Toggle availability
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <AppLayout
      title="Active roster"
      subtitle="See which drivers are currently active and nudge them online or offline in real time."
      actions={headerActions}
    >
      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by driver, cab, status or availability"
            />
          </div>
          <div className="summary">{filtered.length} of {actives.length} actives displayed</div>
        </div>
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default ActivesList;