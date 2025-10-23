import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import API from '../../services/api';

const VehicleFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ driverId: '', cabNumber: '' });
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [fileErrors, setFileErrors] = useState({});
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
    setZipLoading(true);
    setError('');
    try {
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
    } finally {
      setZipLoading(false);
    }
  };

  const handleDownloadFile = (file) => {
    (async () => {
      try {
        setDownloadingId(file.vehicleId);
        setFileErrors((p) => ({ ...p, [file.vehicleId]: null }));
  // Normalize download URL so we don't accidentally double-prefix the API base path
  // (server may include a leading /api in downloadUrl while our axios instance
  // already uses baseURL='/api'). If downloadUrl starts with '/api/', strip
  // that prefix so axios will resolve it correctly. If it's an absolute URL
  // (http/https) leave it as-is.
  const rawUrl = file.downloadUrl || `/vehicles/${file.vehicleId}/inspection`;
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : rawUrl.replace(/^\/api/i, '');
        // Debug: log resolved URL and token presence so we can diagnose failures
        try {
          console.debug('[VehicleFiles] download request', { rawUrl, url, baseURL: API.defaults.baseURL, token: !!localStorage.getItem('token') });
        } catch (e) {}
        const res = await API.get(url, { responseType: 'blob' });
        // Note: API is an axios instance with baseURL=/api; above we trimmed leading /api to avoid double prefixing
        if (res.status !== 200) {
          const msg = res.data?.message || `Download failed (${res.status})`;
          setFileErrors((p) => ({ ...p, [file.vehicleId]: msg }));
          window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: msg, tone: 'warning' } }));
          setDownloadingId(null);
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
        setDownloadingId(null);
      } catch (err) {
        console.error('download error', err);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          navigate('/login');
          window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: 'Not authenticated. Redirecting to login...', tone: 'warning' } }));
          setDownloadingId(null);
          return;
        }
        const msg = err.response?.data?.message || err.message || 'Failed to download file. See console for details.';
        setFileErrors((p) => ({ ...p, [file.vehicleId]: msg }));
        // Provide an alert with server response body if available to aid debugging
        try {
          if (err.response && err.response.data) {
            alert(`Download failed: ${JSON.stringify(err.response.data).slice(0, 200)}`);
          }
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('taxiops:pushNotification', { detail: { message: msg, tone: 'warning' } }));
        setDownloadingId(null);
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
            <button className="btn btn-subtle" type="button" onClick={fetchFiles} disabled={loading}>Apply</button>
            {zipLoading ? (
              <button className="btn btn-ghost" type="button" disabled>
                Downloading ZIP...
              </button>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={handleDownloadZip} disabled={!anyAvailable}>Download ZIP</button>
            )}
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
                          <tr key={f.filename || f.vehicleId}>
                    <td>{f.cabNumber}</td>
                    <td>{f.filename}</td>
                    <td>{f.originalName}</td>
                    <td>{f.size ? `${(f.size/1024).toFixed(1)} KB` : '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!f.available ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span
                            className="badge badge-warning"
                            title={f.checkedStorage ? (Array.isArray(f.checkedStorage) ? f.checkedStorage.join('\n') : f.checkedStorage) : (f.checkedPaths ? f.checkedPaths.slice(0,5).join('\n') : 'File not found on server')}
                          >
                            Unavailable
                          </span>
                          {fileErrors[f.vehicleId] ? (
                            <div style={{ color: '#e5b200', marginTop: 6, fontSize: 12 }}>{fileErrors[f.vehicleId]}</div>
                          ) : null}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <button className="btn btn-ghost" type="button" onClick={() => handleDownloadFile(f)} disabled={downloadingId && downloadingId !== f.vehicleId}>
                            {downloadingId === f.vehicleId ? 'Downloading...' : 'Download'}
                          </button>
                          {fileErrors[f.vehicleId] ? (
                            <div style={{ color: '#e5b200', marginTop: 6, fontSize: 12 }}>{fileErrors[f.vehicleId]}</div>
                          ) : null}
                        </div>
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
