import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import API from '../../services/api';

export default function DiagnosticsViewer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState('');

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (driverId) params.driverId = driverId;
      const res = await API.get('/diagnostics', { params });
      setItems(res.data.diagnostics || []);
    } catch (err) {
      console.error('fetchDiagnostics', err);
      alert('Failed to load diagnostics. See console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout title="Diagnostics" subtitle="Uploaded driver diagnostics for analysis">
      <div className="panel" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Driver diagnostics</h3>
            <p className="panel-subtitle">Filter by driver and inspect uploaded diagnostics.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Driver ID" value={driverId} onChange={(e) => setDriverId(e.target.value)} />
            <button className="btn btn-primary" type="button" onClick={fetchDiagnostics} disabled={loading}>Refresh</button>
          </div>
        </div>

        <div className="panel-body">
          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : items.length === 0 ? (
            <div className="fleet-alert-empty">No diagnostics found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>When</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id}>
                    <td>{it.driverId}</td>
                    <td>{new Date(it.createdAt).toLocaleString()}</td>
                    <td style={{ whiteSpace: 'pre-wrap', maxWidth: 600 }}>{JSON.stringify(it.payload || {}, null, 2).substring(0, 800)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
