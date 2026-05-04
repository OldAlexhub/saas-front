import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { getAppInfo, getApkDownloadUrl } from '../../services/appService';

const icons = {
  download: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

const fmt = (bytes) => {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

const fmtDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString();
  } catch {
    return '—';
  }
};

const DriverAppDownload = () => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const downloadUrl = getApkDownloadUrl();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAppInfo();
        setInfo(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load app info');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const renderBody = () => {
    if (loading) return <div className="skeleton" style={{ height: '200px' }} />;

    return (
      <>
        {error && <div className="feedback error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="grid-two">
          <div className="metric-card">
            <h3>Current release</h3>
            <div className="metric-subline">Built from driverapp/package.json</div>
            <dl className="meta-grid">
              <dt>Version</dt>
              <dd>{info?.version ?? '—'}</dd>
              <dt>Filename</dt>
              <dd>{info?.filename ?? '—'}</dd>
              <dt>File size</dt>
              <dd>{fmt(info?.sizeBytes)}</dd>
              <dt>Built</dt>
              <dd>{fmtDate(info?.builtAt)}</dd>
            </dl>
          </div>

          <div className="metric-card">
            <h3>Admin download</h3>
            <div className="metric-subline">Download the APK directly to your device</div>
            <div style={{ marginTop: 24 }}>
              <a
                href={downloadUrl}
                className="btn btn-primary"
                download
              >
                {icons.download} Download APK
              </a>
            </div>
            {info?.version && (
              <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                TaxiOps-Driver-v{info.version}.apk &nbsp;·&nbsp; {fmt(info.sizeBytes)}
              </p>
            )}
          </div>
        </div>

        <div className="form-section" style={{ marginTop: 24 }}>
          <div>
            <h3>Shareable driver link</h3>
            <p>Copy this URL and email it to a driver so they can install the app on their device.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              readOnly
              value={downloadUrl}
              style={{ flex: 1, minWidth: 0 }}
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="btn btn-primary" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        <div className="form-section" style={{ marginTop: 16 }}>
          <div>
            <h3>Releasing a new version</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 12 }}>
              Everything is automated. From the project root, run:
            </p>
            <pre style={{
              background: '#1e1e1e',
              color: '#d4d4d4',
              padding: '12px 16px',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontFamily: 'monospace',
            }}>python release.py</pre>
            <p style={{ fontSize: '0.85rem', marginTop: 12 }}>
              The script will ask for the new version number, build the APK, copy it here, and update the version — then just deploy the server.
            </p>
          </div>
        </div>
      </>
    );
  };

  return (
    <AppLayout
      title="Driver app"
      subtitle="Download and distribute the Android driver app to your fleet."
    >
      <div className="surface">
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default DriverAppDownload;
