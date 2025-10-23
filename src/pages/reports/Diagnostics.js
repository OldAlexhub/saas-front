import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import API from '../../services/api';

const Diagnostics = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(100);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit };
      if (driverId) params.driverId = driverId;
      const res = await API.get('/admin/diagnostics', { params });
      const data = res.data || {};
      setRows(Array.isArray(data.diagnostics) ? data.diagnostics : data.diagnostics || []);
    } catch (err) {
      console.error('fetchDiagnostics error', err);
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Failed to load diagnostics';
      if (status === 401 || status === 403) {
        // Redirect to login on auth errors (or show disabled message for 403)
        if (status === 401) {
          navigate('/login');
          setError('Not authenticated. Redirecting to login...');
        } else {
          setError(msg || 'Diagnostics access is disabled on the server.');
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    // don't auto-fetch until user requests; prevents accidental exposure
  }, []);

  return (
    <AppLayout title="Diagnostics" subtitle="View driver-submitted diagnostics and run quick checks"> 
      <div className="panel" style={{ maxWidth: 980, margin: '0 auto' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Diagnostics</h3>
            <p className="panel-subtitle">Query recent diagnostics submitted by drivers.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Driver ID" value={driverId} onChange={(e) => setDriverId(e.target.value)} />
            <input type="number" placeholder="Limit" value={limit} onChange={(e) => setLimit(Number(e.target.value || 0))} style={{ width: 100 }} />
            <button className="btn btn-primary" type="button" onClick={fetchDiagnostics} disabled={loading}>Fetch</button>
          </div>
        </div>

        <div className="panel-body">
          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : error ? (
            <div className="feedback error">{error}</div>
          ) : rows.length === 0 ? (
            <div className="fleet-alert-empty">No diagnostics found. Use Fetch to load recent entries.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>At</th>
                  <th>Driver</th>
                  <th>Level</th>
                  <th>Tag</th>
                  <th>Message</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id || `${r.driverId}-${r.at}`}>
                    <td>{new Date(r.at).toLocaleString()}</td>
                    <td>{r.driverId || '-'}</td>
                    <td>{r.level}</td>
                    <td>{r.tag}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.message}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.payload ? JSON.stringify(r.payload) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Diagnostics;
