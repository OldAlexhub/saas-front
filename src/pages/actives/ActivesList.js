import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import AppLayout from '../../components/AppLayout';
import { listActives, updateAvailability, updateStatus } from '../../services/activeService';
import { getVehiclesByCabNumbers } from '../../services/vehicleService';

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
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
    // compliance dates (pull common names from nested objects)
    dlExpiry: pickFirst(driver.dlExpiry, driver.licenseExpiry, driver.license_expires, driver.dl_expiry),
    cbiExpiry: pickFirst(driver.cbiExpiry, driver.cbi_expiry),
    dotExpiry: pickFirst(driver.dotExpiry, driver.dot_expiry),
    regisExpiry: pickFirst(vehicle.regisExpiry, vehicle.registrationExpiry, vehicle.registration_expiry),
    annualInspection: pickFirst(vehicle.annualInspection, vehicle.annual_inspection),
  };

  return normalized;
};

// Small expiry badge helper (copied from VehiclesList/DriversList to show status inline)
const expiryBadge = (value) => {
  if (!value) return <span className="badge badge-warning">Missing</span>;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return <span className="badge badge-warning">Invalid</span>;
  const diff = (parsed - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return <span className="badge badge-warning">Expired</span>;
  if (diff < 30) return <span className="badge badge-warning">Expiring soon</span>;
  return <span className="badge badge-success">Compliant</span>;
};

const complianceBadge = ({ dlExpiry, cbiExpiry, dotExpiry }) => {
  if (!dlExpiry && !cbiExpiry && !dotExpiry) return <span className="badge badge-warning">Missing</span>;
  const now = new Date();
  const expiries = [dlExpiry, cbiExpiry, dotExpiry]
    .map((v) => (v ? new Date(v) : null))
    .filter(Boolean);
  if (!expiries.length) return <span className="badge badge-warning">Missing</span>;
  const diffs = expiries.map((d) => (d - now) / (1000 * 60 * 60 * 24));
  if (diffs.some((diff) => diff < 0)) return <span className="badge badge-warning">Expired</span>;
  if (diffs.some((diff) => diff < 30)) return <span className="badge badge-warning">Expiring soon</span>;
  return <span className="badge badge-success">Compliant</span>;
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
      // Batch-fetch vehicles once and build a map (avoid N+1 calls)
      const now = new Date();
      try {
        // Build unique cabNumber list from normalized payload
        const cabSet = new Set();
        for (const it of normalized) {
          if (!it) continue;
          const cab = it.cabNumber;
          if (cab) cabSet.add(String(cab).trim());
        }
        const cabList = Array.from(cabSet);
        let vehicleMap = new Map();
        if (cabList.length) {
          const vehRes = await getVehiclesByCabNumbers(cabList);
          // server returns { vehicles, byCab }
          const byCab = vehRes.data?.byCab || {};
          vehicleMap = new Map(Object.entries(byCab));
        }

        const enriched = normalized.map((item) => {
          // Only skip enrichment when we already have the actual date fields.
          // Previously we also skipped when vehicleCompliance existed which
          // prevented filling missing regisExpiry/annualInspection on records
          // that had a compliance summary but no dates — causing the UI to
          // show "Missing" badges. Ensure we still enrich when dates are absent.
          if (item.regisExpiry || item.annualInspection) return item;
          const cab = item.cabNumber;
          if (!cab) return item;
          const vehicle = vehicleMap.get(String(cab).trim()) || null;
          if (!vehicle) return item;
          const reg = vehicle.regisExpiry || vehicle.registrationExpiry || null;
          const insp = vehicle.annualInspection || null;
          const issues = [];
          if (!reg) issues.push('registrationMissing');
          else if (new Date(reg) < now) issues.push('registrationExpired');
          if (!insp) issues.push('inspectionMissing');
          else if (new Date(insp) < now) issues.push('inspectionExpired');
          return {
            ...item,
            regisExpiry: item.regisExpiry || reg,
            annualInspection: item.annualInspection || insp,
            vehicleCompliance: { isCompliant: issues.length === 0, issues },
          };
        });
        setActives(enriched);
      } catch (_e) {
        // If vehicle list fetch fails, fall back to normalized payload
        setActives(normalized);
      }
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
      <div className="table-responsive-stack">
        <table className="data-table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>Cab</th>
            <th>Compliance</th>
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
                <td data-label="Driver">
                  <div className="table-stack">
                    <span className="primary">{driverLabel}</span>
                    <span className="secondary">ID: {active.driverId || '—'}</span>
                  </div>
                </td>
                <td data-label="Cab">
                  <div className="table-stack">
                    <span className="primary">Cab #{active.cabNumber || '—'}</span>
                    <span className="secondary">
                      Last ping: {lastPing ? new Date(lastPing).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </td>
                <td data-label="Compliance">
                  <div className="table-stack">
                    <span className="primary">{complianceBadge({ dlExpiry: active.dlExpiry, cbiExpiry: active.cbiExpiry, dotExpiry: active.dotExpiry })}</span>
                    <span className="secondary">Veh: {expiryBadge(active.regisExpiry)} {expiryBadge(active.annualInspection)}</span>
                  </div>
                </td>
                <td data-label="Status">
                  <span className={`badge ${active.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                    {active.status || 'Inactive'}
                </span>
              </td>
              <td data-label="Availability">
                <span className={`badge ${active.availability === 'Online' ? 'badge-info' : 'badge-warning'}`}>
                  {active.availability || 'Offline'}
                </span>
              </td>
              <td data-label="Actions">
                <div className="pill-group">
                  <Link className="pill-button" to={`/actives/${active._id}`}>
                    Manage
                  </Link>
                  <Link className="pill-button" to={`/actives/${active._id}/view`}>
                    View
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
      </div>
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