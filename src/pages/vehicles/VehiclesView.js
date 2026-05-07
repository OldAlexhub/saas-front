import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getVehicle } from '../../services/vehicleService';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { timeZone: 'UTC' });
  } catch (e) {
    return '—';
  }
};

const expiryBadge = (value) => {
  if (!value) return <span className="badge badge-warning">Missing</span>;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return <span className="badge badge-warning">Invalid</span>;
  const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return <span className="badge badge-warning">Expired</span>;
  if (diff < 30) return <span className="badge badge-warning">Expiring soon</span>;
  return <span className="badge badge-success">Compliant</span>;
};

const nemtSummary = (vehicle) => {
  const caps = vehicle.nemtCapabilities || {};
  const capacity = vehicle.nemtCapacity || {};
  const labels = [];
  if (caps.ambulatory !== false) labels.push('Ambulatory');
  if (caps.wheelchair) labels.push('Wheelchair');
  if (caps.wheelchairXL) labels.push('Wheelchair XL');
  if (caps.stretcher) labels.push('Stretcher');
  return { caps, capacity, labels };
};

const VehiclesView = () => {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getVehicle(id);
        const payload = res.data?.vehicle || res.data || null;
        setVehicle(payload);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const renderBody = () => {
    if (loading) return <div className="skeleton" style={{ height: '240px' }} />;
    if (error) return <div className="feedback error">{error}</div>;
    if (!vehicle) return <div className="empty-state">Vehicle not found.</div>;
    const nemt = nemtSummary(vehicle);

    return (
      <div className="panel">
        <div className="panel-header">
          <h2>Cab #{vehicle.cabNumber || '—'}</h2>
          <div className="panel-actions">
            <Link to={`/vehicles/${id}`} className="btn btn-primary">Manage</Link>
            <Link to="/vehicles" className="btn btn-subtle">Back to list</Link>
          </div>
        </div>

        <div className="panel-body">
          <div className="grid-two">
            <div className="metric-card">
              <h3>Overview</h3>
              <div className="metric-subline">{vehicle.make || '—'} {vehicle.model || ''}</div>
              <dl className="meta-grid">
                <dt>Year</dt>
                <dd>{vehicle.year || '—'}</dd>
                <dt>Color</dt>
                <dd>{vehicle.color || '—'}</dd>
                <dt>VIN</dt>
                <dd>{vehicle.vinNumber || '—'}</dd>
              </dl>
            </div>

            <div className="metric-card">
              <h3>Registration & inspection</h3>
              <div className="metric-subline">Critical expiry dates</div>
              <dl className="meta-grid">
                <dt>Plates</dt>
                <dd>{vehicle.licPlates || '—'}</dd>

                <dt>Registration expiry</dt>
                <dd>
                  <div className="muted">Expires {formatDate(vehicle.regisExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(vehicle.regisExpiry)}</div>
                </dd>

                <dt>Annual inspection</dt>
                <dd>
                  <div className="muted">{formatDate(vehicle.annualInspection)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(vehicle.annualInspection)}</div>
                </dd>
              </dl>
            </div>

            <div className="metric-card">
              <h3>NEMT capability</h3>
              <div className="metric-subline">{nemt.labels.length ? nemt.labels.join(' / ') : 'No NEMT capabilities set'}</div>
              <dl className="meta-grid">
                <dt>Ambulatory seats</dt>
                <dd>{nemt.capacity.ambulatorySeats ?? 4}</dd>
                <dt>Wheelchair positions</dt>
                <dd>{nemt.capacity.wheelchairPositions ?? 0}</dd>
                <dt>Stretcher positions</dt>
                <dd>{nemt.capacity.stretcherPositions ?? 0}</dd>
                <dt>Total riders/attendants</dt>
                <dd>{nemt.capacity.maxPassengerCount ?? 4}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Vehicle profile" subtitle="Read-only view and expiry highlights for the vehicle">
      <div className="surface">{renderBody()}</div>
    </AppLayout>
  );
};

export default VehiclesView;
