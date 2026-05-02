import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { getAppInfo, getApkDownloadUrl } from '../../services/appService';

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
                download
                className="btn btn-primary"
                style={{ display: 'inline-block' }}
              >
                Download APK
              </a>
            </div>
            {info?.version && (
              <p className="muted" style={{ marginTop: 12, fontSize: '0.8rem' }}>
                TaxiOps-Driver-v{info.version}.apk
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
            <h3>Updating the app</h3>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
              To publish a new version, follow these steps:
            </p>
            <ol style={{ fontSize: '0.85rem', paddingLeft: '1.4rem', lineHeight: 1.8 }}>
              <li>Bump the version in <code>driverapp/package.json</code> (e.g. <code>"version": "1.1.0"</code>)</li>
              <li>Open a terminal in the project root and run:
                <pre style={{ background: 'var(--surface-alt, #f4f4f4)', padding: '10px 14px', borderRadius: 6, marginTop: 6, overflowX: 'auto', fontSize: '0.8rem', lineHeight: 1.6 }}>{`set JAVA_HOME=C:\\Program Files\\Android\\Android Studio\\jbr\nset ANDROID_HOME=C:\\Users\\moham\\AppData\\Local\\Android\\Sdk\ncd driverapp\\android\ngradlew.bat assembleRelease`}</pre>
              </li>
              <li>The server automatically picks up the new APK and serves it with the updated version name — no file moves required.</li>
            </ol>
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
