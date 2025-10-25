import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getDriver } from '../../services/driverService';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
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

const DriversView = () => {
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getDriver(id);
        const payload = res.data?.driver || res.data || null;
        setDriver(payload);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load driver');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const renderBody = () => {
    if (loading) return <div className="skeleton" style={{ height: '240px' }} />;
    if (error) return <div className="feedback error">{error}</div>;
    if (!driver) return <div className="empty-state">Driver not found.</div>;

    return (
      <div className="panel">
        <div className="panel-header">
          <h2>{driver.firstName} {driver.lastName}</h2>
          <div className="panel-actions">
            <Link to={`/drivers/${id}`} className="btn btn-primary">Manage</Link>
            <Link to="/drivers" className="btn btn-subtle">Back to list</Link>
          </div>
        </div>

        <div className="panel-body">
          <div className="grid-two">
            <div className="metric-card">
              <h3>Contact</h3>
              <div className="metric-subline">
                <span className="dot" />
                {driver.company || 'No company on file'}
              </div>
              <dl className="meta-grid">
                <dt>Phone</dt>
                <dd>{driver.phoneNumber || '—'}</dd>
                <dt>Email</dt>
                <dd>{driver.email || '—'}</dd>
                <dt>DOB</dt>
                <dd>{formatDate(driver.dob)}</dd>
              </dl>
            </div>

            <div className="metric-card">
              <h3>License & checks</h3>
              <div className="metric-subline">Key expiry dates and compliance</div>
              <dl className="meta-grid">
                <dt>License</dt>
                <dd>
                  <div>{driver.dlNumber || '—'}</div>
                  <div className="muted">Expires {formatDate(driver.dlExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(driver.dlExpiry)}</div>
                </dd>

                <dt>CBI</dt>
                <dd>
                  <div className="muted">Expires {formatDate(driver.cbiExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(driver.cbiExpiry)}</div>
                </dd>

                <dt>DOT</dt>
                <dd>
                  <div className="muted">Expires {formatDate(driver.dotExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(driver.dotExpiry)}</div>
                </dd>
              </dl>
            </div>
          </div>

          <div className="form-section">
            <h3>Notes & status</h3>
            <p className="panel-subtitle">Quick reference for operational status</p>
            <dl className="meta-grid">
              <dt>Company</dt>
              <dd>{driver.company || '—'}</dd>
              <dt>Status</dt>
              <dd>{driver.status || '—'}</dd>
            </dl>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Driver profile" subtitle="Read-only view of driver data and expiries">
      <div className="surface">
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default DriversView;
