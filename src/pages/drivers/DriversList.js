import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listDrivers } from '../../services/driverService';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const formatted = new Date(value);
    if (Number.isNaN(formatted.getTime())) return '—';
    return formatted.toLocaleDateString();
  } catch (e) {
    return '—';
  }
};

const expiryBadge = (value) => {
  if (!value) {
    return <span className="badge badge-warning">Missing</span>;
  }
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) {
    return <span className="badge badge-warning">Invalid date</span>;
  }
  const diff = (expiry - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) {
    return <span className="badge badge-warning">Expired</span>;
  }
  if (diff < 30) {
    return <span className="badge badge-warning">Expiring soon</span>;
  }
  return <span className="badge badge-success">Compliant</span>;
};

const DriversList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listDrivers();
        const items = res.data?.drivers || res.data?.results || res.data || [];
        setDrivers(Array.isArray(items) ? items : []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch drivers';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return drivers;
    return drivers.filter((driver) => {
      const target = [
        driver.firstName,
        driver.lastName,
        driver.email,
        driver.phoneNumber,
        driver.dlNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(query);
    });
  }, [drivers, search]);

  const headerActions = (
    <Link to="/drivers/new" className="btn btn-primary">
      <span className="icon">＋</span>
      Add driver
    </Link>
  );

  const renderBody = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '260px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!filteredDrivers.length) {
      return (
        <div className="empty-state">
          No drivers match your search. Try adjusting your filters or add a new profile.
        </div>
      );
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>Contact</th>
            <th>License</th>
            <th>Compliance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDrivers.map((driver) => (
            <tr key={driver._id}>
              <td>
                <div className="table-stack">
                  <span className="primary">{driver.firstName} {driver.lastName}</span>
                  <span className="secondary">DOB: {formatDate(driver.dob)}</span>
                </div>
              </td>
              <td>
                <div className="table-stack">
                  <span className="primary">{driver.phoneNumber || '—'}</span>
                  <span className="secondary">{driver.email || 'No email on file'}</span>
                </div>
              </td>
              <td>
                <div className="table-stack">
                  <span className="primary">{driver.dlNumber || '—'}</span>
                  <span className="secondary">Expires {formatDate(driver.dlExpiry)}</span>
                </div>
              </td>
              <td>
                <div className="table-stack">
                  <span className="primary">{expiryBadge(driver.dlExpiry)}</span>
                  <span className="secondary">CBI: {formatDate(driver.cbiExpiry)} • DOT: {formatDate(driver.dotExpiry)}</span>
                </div>
              </td>
              <td>
                <Link className="pill-button" to={`/drivers/${driver._id}`}>
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <AppLayout
      title="Driver directory"
      subtitle="Keep tabs on compliance, documents and contact details for every driver."
      actions={headerActions}
    >
      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by name, phone, email or license"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="summary">
            Showing {filteredDrivers.length} of {drivers.length} drivers
          </div>
        </div>
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default DriversList;