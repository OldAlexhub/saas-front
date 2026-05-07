import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listVehicles } from '../../services/vehicleService';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { timeZone: 'UTC' });
};

const expiryBadge = (value) => {
  if (!value) return <span className="badge badge-warning">Missing</span>;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return <span className="badge badge-warning">Invalid</span>;
  }
  const diff = (parsed - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return <span className="badge badge-warning">Expired</span>;
  if (diff < 30) return <span className="badge badge-warning">Expiring soon</span>;
  return <span className="badge badge-success">Compliant</span>;
};

const nemtSummary = (vehicle) => {
  const caps = vehicle.nemtCapabilities || {};
  const capacity = vehicle.nemtCapacity || {};
  const labels = [];
  if (caps.ambulatory !== false) labels.push('AMB');
  if (caps.wheelchair) labels.push('WC');
  if (caps.wheelchairXL) labels.push('WC XL');
  if (caps.stretcher) labels.push('STR');
  return {
    labels: labels.length ? labels.join(' / ') : 'Not set',
    capacity: `${capacity.maxPassengerCount ?? 4} riders, ${capacity.wheelchairPositions ?? 0} WC, ${capacity.stretcherPositions ?? 0} STR`,
  };
};

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listVehicles();
        const items = res.data?.vehicles || res.data?.list || res.data || [];
        setVehicles(Array.isArray(items) ? items : []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch vehicles';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((vehicle) => {
      const target = [
        vehicle.cabNumber,
        vehicle.vinNumber,
        vehicle.licPlates,
        vehicle.make,
        vehicle.model,
        vehicle.color,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(query);
    });
  }, [vehicles, search]);

  const actions = (
    <Link to="/vehicles/new" className="btn btn-primary">
      <span className="icon">＋</span>
      Add vehicle
    </Link>
  );

  const renderBody = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '260px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!filteredVehicles.length) {
      return <div className="empty-state">No vehicles match this filter yet.</div>;
    }

    return (
      <div className="table-responsive-stack">
        <table className="data-table">
        <thead>
          <tr>
            <th>Cab</th>
            <th>Registration</th>
            <th>Make & model</th>
            <th>NEMT</th>
            <th>Identifiers</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredVehicles.map((vehicle) => (
            <tr key={vehicle._id}>
              <td data-label="Cab">
                <div className="table-stack">
                  <span className="primary">Cab #{vehicle.cabNumber || '—'}</span>
                  <span className="secondary">Year {vehicle.year || '—'} • {vehicle.color || 'No color set'}</span>
                </div>
              </td>
              <td data-label="Registration">
                <div className="table-stack">
                  <span className="primary">{expiryBadge(vehicle.regisExpiry)}</span>
                  <span className="secondary">Expires {formatDate(vehicle.regisExpiry)}</span>
                </div>
              </td>
              <td data-label="Make & model">
                <div className="table-stack">
                  <span className="primary">{vehicle.make || '—'} {vehicle.model || ''}</span>
                  <span className="secondary">Annual inspection: {formatDate(vehicle.annualInspection)} {' '}{expiryBadge(vehicle.annualInspection)}</span>
                </div>
              </td>
              <td data-label="NEMT">
                <div className="table-stack">
                  <span className="primary">{nemtSummary(vehicle).labels}</span>
                  <span className="secondary">{nemtSummary(vehicle).capacity}</span>
                </div>
              </td>
              <td data-label="Identifiers">
                <div className="table-stack">
                  <span className="primary">Plate: {vehicle.licPlates || '—'}</span>
                  <span className="secondary">VIN: {vehicle.vinNumber || '—'}</span>
                </div>
              </td>
              <td data-label="Actions">
                <div className="pill-group">
                  <Link className="pill-button" to={`/vehicles/${vehicle._id}`}>
                    Manage
                  </Link>
                  <Link className="pill-button" to={`/vehicles/${vehicle._id}/view`}>
                    View
                  </Link>
                </div>
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
      title="Fleet overview"
      subtitle="Keep every vehicle compliant and road ready with quick access to critical data."
      actions={actions}
    >
      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by cab number, VIN, plate, make or model"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="summary">{filteredVehicles.length} of {vehicles.length} vehicles listed</div>
        </div>
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default VehiclesList;
