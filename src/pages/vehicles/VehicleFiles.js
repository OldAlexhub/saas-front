import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import API from '../../services/api';

const VehicleFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ driverId: '', cabNumber: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter.driverId) params.driverId = filter.driverId;
      if (filter.cabNumber) params.cabNumber = filter.cabNumber;

      const res = await API.get('/vehicle-files', { params });
      // axios already parses JSON
      const data = res.data || {};
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      console.error('fetchFiles error', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load files';
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
        setError('Not authenticated. Redirecting to login...');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadZip = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.driverId) params.set('driverId', filter.driverId);
      if (filter.cabNumber) params.set('cabNumber', filter.cabNumber);
      const paramsObj = {};
      if (filter.driverId) paramsObj.driverId = filter.driverId;
      if (filter.cabNumber) paramsObj.cabNumber = filter.cabNumber;
      const res = await API.get('/vehicle-files/zip', { params: paramsObj, responseType: 'blob' });
      const ct = (res.headers['content-type'] || '').toLowerCase();
      if (res.status !== 200) {
        console.error('ZIP download failed', res.status, res.headers, res.data?.slice?.(0, 1000));
        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          setError('Not authenticated. Redirecting to login...');
        } else {
          setError('Failed to download ZIP');
        }
        return;
      }

      if (!ct.includes('application/zip') && !ct.includes('application/octet-stream')) {
        console.error('ZIP endpoint returned non-zip content', ct);
        setError('Server did not return a ZIP file. See console for details.');
        return;
      }

      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `vehicle-files${filter.cabNumber ? `-${filter.cabNumber}` : ''}.zip`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('handleDownloadZip error', err);
      const msg = err.response?.data?.message || err.message || 'Failed to download ZIP. See console for details.';
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
        setError('Not authenticated. Redirecting to login...');
      } else {
        setError(msg);
      }
    }
  };

  const handleDownloadFile = (file) => {
    (async () => {
      try {
        const url = file.downloadUrl || `/api/vehicles/${file.vehicleId}/inspection`;
        const res = await API.get(url.replace(/^\/api/, ''), { responseType: 'blob' });
        // Note: API is an axios instance with baseURL=/api; above we trimmed leading /api to avoid double prefixing
        if (res.status !== 200) {
          const msg = res.data?.message || `Download failed (${res.status})`;
          window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: msg, tone: 'warning' } }));
          return;
        }

        const contentType = (res.headers['content-type'] || '').toLowerCase();
        if (!contentType.includes('application') && !contentType.includes('pdf') && !contentType.includes('image')) {
          window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: 'Server returned invalid file content.', tone: 'warning' } }));
          return;
        }

        const blob = res.data;
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = file.originalName || file.filename || 'inspection-file';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(link.href);
        window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: 'Inspection downloaded', tone: 'success' } }));
      } catch (err) {
        console.error('download error', err);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          navigate('/login');
          window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: 'Not authenticated. Redirecting to login...', tone: 'warning' } }));
          return;
        }
        const msg = err.response?.data?.message || err.message || 'Failed to download file. See console for details.';
        window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: msg, tone: 'warning' } }));
      }
    })();
  };

  const anyAvailable = files.some((f) => f.available);

  return (
    <AppLayout title="Vehicle files" subtitle="List and download vehicle inspection files"> 
      <div className="panel" style={{ maxWidth: 980, margin: '0 auto' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Vehicle inspection files</h3>
            <p className="panel-subtitle">Filter by driver or cab number and download files individually or in a ZIP.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="button" onClick={fetchFiles} disabled={loading}>Refresh</button>
            <button className="btn btn-ghost" type="button" onClick={handleDownloadZip} disabled={!anyAvailable}>Download ZIP</button>
          </div>
        </div>

            <div className="panel-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input placeholder="Driver ID" value={filter.driverId} onChange={(e) => setFilter((p) => ({ ...p, driverId: e.target.value }))} />
            <input placeholder="Cab number" value={filter.cabNumber} onChange={(e) => setFilter((p) => ({ ...p, cabNumber: e.target.value }))} />
            <button className="btn btn-subtle" type="button" onClick={fetchFiles}>Apply</button>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : error ? (
            <div className="feedback error">{error}</div>
          ) : files.length === 0 ? (
            <div className="fleet-alert-empty">No files found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cab</th>
                  <th>Filename</th>
                  <th>Original name</th>
                  <th>Size</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.filename}>
                    <td>{f.cabNumber}</td>
                    <td>{f.filename}</td>
                    <td>{f.originalName}</td>
                    <td>{f.size ? `${(f.size/1024).toFixed(1)} KB` : '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!f.available ? (
                        <span
                          className="badge badge-warning"
                          title={f.checkedPaths ? f.checkedPaths.slice(0,5).join('\n') : 'File not found on server'}
                        >
                          Unavailable
                        </span>
                      ) : (
                        <button className="btn btn-ghost" type="button" onClick={() => handleDownloadFile(f)}>Download</button>
                      )}
                    </td>
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

export default VehicleFiles;
