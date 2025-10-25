import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getActive } from '../../services/activeService';
import { getDriver } from '../../services/driverService';
import { getVehicle } from '../../services/vehicleService';

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

const pickFirst = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

const ActivesView = () => {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullDriver, setFullDriver] = useState(null);
  const [fullVehicle, setFullVehicle] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getActive(id);
        const payload = res.data?.active || res.data || null;
        setRecord(payload);

        // If the active record contains a driver id or nested driver _id, fetch
        // the canonical driver record so we can use the same compliance fields
        // and canonical expiry dates as the Drivers view.
        try {
          const driverId = payload?.driverId || payload?.driver?._id || payload?.driver?.id;
          if (driverId) {
            const dr = await getDriver(driverId);
            // driver API may return { driver } or the driver object at top-level
            const full = dr.data?.driver || dr.data || null;
            if (full) setFullDriver(full);
          }
        } catch (e) {
          // ignore driver fetch errors; view will fall back to nested driver data
          console.debug('Failed to fetch full driver for active view', e?.message || e);
        }

        // Likewise fetch vehicle details if vehicle id is available
        try {
          const vehicleId = payload?.vehicle?._id || payload?.vehicle?.id || payload?.cab?._id || payload?.cab?.id || payload?.vehicleId;
          if (vehicleId) {
            const vr = await getVehicle(vehicleId);
            const fullV = vr.data?.vehicle || vr.data || null;
            if (fullV) setFullVehicle(fullV);
          } else {
            // fallback: try fetching by cabNumber (active records commonly store cabNumber)
            const cab = payload?.cabNumber || payload?.cab?.cabNumber || payload?.vehicle?.cabNumber;
            if (cab) {
              // getVehicleByCabNumber returns { vehicle }
              const byCab = await import('../../services/vehicleService').then((m) => m.getVehicleByCabNumber(cab));
              const fullV = byCab?.vehicle || null;
              if (fullV) setFullVehicle(fullV);
            }
          }
        } catch (e) {
          console.debug('Failed to fetch full vehicle for active view', e?.message || e);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load active record');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const normalize = (rec) => {
    if (!rec) return null;
    // Prefer canonical driver/vehicle records fetched from the API when available
    const driver = fullDriver || rec.driver || rec.driverInfo || rec.driverProfile || {};
    const vehicle = fullVehicle || rec.vehicle || rec.vehicleInfo || rec.cab || {};
    // Build vehicleCompliance: prefer snapshot, otherwise derive from canonical vehicle fields
    const rawSnapshot = pickFirst(rec.vehicleCompliance, vehicle.vehicleCompliance);
    const now = new Date();
    let derivedCompliance = null;
    if (!rawSnapshot) {
      const issues = [];
      const reg = pickFirst(rec.regisExpiry, vehicle.regisExpiry, vehicle.registrationExpiry);
      const insp = pickFirst(rec.annualInspection, vehicle.annualInspection);
      if (!reg) {
        issues.push('registrationMissing');
      } else if (new Date(reg) < now) {
        issues.push('registrationExpired');
      }
      if (!insp) {
        issues.push('inspectionMissing');
      } else if (new Date(insp) < now) {
        issues.push('inspectionExpired');
      }
      derivedCompliance = { isCompliant: issues.length === 0, issues };
    }

    return {
      _id: rec._id,
      driverId: pickFirst(rec.driverId, driver._id, driver.id, driver.driverId),
      firstName: pickFirst(rec.firstName, driver.firstName, driver.givenName),
      lastName: pickFirst(rec.lastName, driver.lastName, driver.familyName),
      phone: pickFirst(driver.phoneNumber, driver.phone),
      email: pickFirst(driver.email),
      cabNumber: pickFirst(rec.cabNumber, vehicle.cabNumber),
      licPlates: pickFirst(rec.licPlates, vehicle.licPlates, vehicle.licensePlate),
      make: pickFirst(rec.make, vehicle.make),
      model: pickFirst(rec.model, vehicle.model),
      color: pickFirst(rec.color, vehicle.color),
      status: pickFirst(rec.status, rec.currentStatus, 'Inactive'),
      availability: pickFirst(rec.availability, rec.currentAvailability, 'Offline'),
      dlExpiry: pickFirst(driver.dlExpiry, driver.licenseExpiry),
      cbiExpiry: pickFirst(driver.cbiExpiry),
      dotExpiry: pickFirst(driver.dotExpiry),
  regisExpiry: pickFirst(rec.regisExpiry, vehicle.regisExpiry, vehicle.registrationExpiry),
  annualInspection: pickFirst(rec.annualInspection, vehicle.annualInspection),
  vehicleCompliance: rawSnapshot || derivedCompliance || null,
      lastPing: rec.currentLocation?.updatedAt || rec.updatedAt || rec.createdAt,
      raw: rec,
    };
  };

  const isDateLike = (v) => {
    // Only treat Date instances and ISO-like date strings as dates.
    // Avoid treating plain numbers (ids, counters) as dates which caused
    // the raw fields card to render numeric values as dates.
    if (!v) return false;
    if (v instanceof Date) return !Number.isNaN(v.getTime());
    if (typeof v === 'string') {
      // Quick heuristic: string should contain date-ish separators like '-' or 'T' or ':' or 'Z'
      if (!/[T\-:\sZ]/.test(v)) return false;
      const parsed = Date.parse(v);
      return !Number.isNaN(parsed);
    }
    // Numbers (and other types) are NOT considered date-like here to avoid
    // accidental formatting of ids/counts as dates.
    return false;
  };

  const isExpiryKey = (k) => {
    if (!k) return false;
    const key = k.toLowerCase();
    return key.includes('expiry') || key.includes('expir') || key.includes('expires') || key.includes('expirydate');
  };

  const renderValue = (key, value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) {
      return (
        <ul className="nearby-drivers-list">
          {value.map((item, i) => (
            <li key={i} style={{ color: 'var(--text-primary)' }}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      // render small key/value list for nested objects — use correct dl children
      const entries = Object.entries(value).filter(([k]) => k !== '_id' && k !== '__v');
      return (
        <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
          {entries.length === 0 ? (
            '—'
          ) : (
            <dl className="meta-grid">
              {entries.map(([k, v]) => (
                <>
                  <dt key={`dt-${k}`} style={{ marginBottom: 6 }}>{k}</dt>
                  <dd key={`dd-${k}`} style={{ marginBottom: 12, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {isDateLike(v) ? formatDate(v) : (v === null || v === undefined ? '—' : String(v))}
                  </dd>
                </>
              ))}
            </dl>
          )}
        </div>
      );
    }
    // primitive
    if (isExpiryKey(key)) {
      return (
        <div>
          <div className="muted">{isDateLike(value) ? formatDate(value) : String(value)}</div>
          <div style={{ marginTop: 8 }}>{expiryBadge(value)}</div>
        </div>
      );
    }
    if (isDateLike(value)) return formatDate(value);
    return String(value);
  };

  const renderRawFields = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
  const excluded = new Set(['currentLocation', 'history', '_id', '__v']);
    const entries = Object.entries(raw).filter(([k]) => !excluded.has(k));
    if (!entries.length) return <div className="empty-state">No raw fields to display.</div>;

    return (
      <div className="metric-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Record details</h3>
        <div className="metric-subline">Stored roster fields (excluding location & history)</div>
        <dl className="meta-grid" style={{ marginTop: 12, rowGap: 10 }}>
          {entries.map(([k, v]) => (
            <div key={`entry-${k}`} style={{ marginBottom: 8 }}>
              <dt style={{ marginBottom: 6, fontWeight: 600 }}>{k}</dt>
              <dd style={{ whiteSpace: 'normal', wordBreak: 'break-word', marginTop: 0 }}>{renderValue(k, v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const renderBody = () => {
    if (loading) return <div className="skeleton" style={{ height: '240px' }} />;
    if (error) return <div className="feedback error">{error}</div>;
    if (!record) return <div className="empty-state">Active record not found.</div>;

    const r = normalize(record);

    return (
      <div className="panel">
        <div className="panel-header">
          <h2>{r.firstName || 'Driver'} {r.lastName || ''}</h2>
          <div className="panel-actions">
            <Link to={`/actives/${r._id}`} className="btn btn-primary">Manage</Link>
            <Link to="/actives" className="btn btn-subtle">Back to roster</Link>
          </div>
        </div>

        <div className="panel-body">
          <div className="grid-two">
            <div className="metric-card">
              <h3>Driver</h3>
              <div className="metric-subline">ID: {r.driverId || '—'}</div>
              <dl className="meta-grid">
                <dt>Phone</dt>
                <dd>{r.phone || '—'}</dd>
                <dt>Email</dt>
                <dd>{r.email || '—'}</dd>
                <dt>Last ping</dt>
                <dd>{r.lastPing ? new Date(r.lastPing).toLocaleString() : 'N/A'}</dd>
              </dl>
            </div>

            <div className="metric-card">
              <h3>Vehicle</h3>
              <div className="metric-subline">Cab #{r.cabNumber || '—'}</div>
              <dl className="meta-grid">
                <dt>Plates</dt>
                <dd>{r.licPlates || '—'}</dd>
                <dt>Make & model</dt>
                <dd>{r.make || '—'} {r.model || ''}</dd>
                <dt>Color</dt>
                <dd>{r.color || '—'}</dd>
              </dl>
            </div>
          </div>

          <div className="grid-two" style={{ marginTop: 12 }}>
            <div className="metric-card">
              <h3>Driver compliance</h3>
              <div className="metric-subline">Key expiry dates</div>
              <dl className="meta-grid">
                <dt>DL expiry</dt>
                <dd>
                  <div className="muted">{formatDate(r.dlExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(r.dlExpiry)}</div>
                </dd>
                <dt>CBI</dt>
                <dd>
                  <div className="muted">{formatDate(r.cbiExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(r.cbiExpiry)}</div>
                </dd>
                <dt>DOT</dt>
                <dd>
                  <div className="muted">{formatDate(r.dotExpiry)}</div>
                  <div style={{ marginTop: 8 }}>{expiryBadge(r.dotExpiry)}</div>
                </dd>
              </dl>
            </div>

            <div className="metric-card">
              <h3>Vehicle compliance</h3>
              <div className="metric-subline">Registration & inspections</div>
              <dl className="meta-grid">
                {r.vehicleCompliance ? (
                  <>
                    <dt>Status</dt>
                    <dd>
                      <div className="muted">{r.vehicleCompliance.isCompliant ? 'Compliant' : 'Non-compliant'}</div>
                      <div style={{ marginTop: 8 }}>
                        {r.vehicleCompliance.isCompliant ? (
                          <span className="badge badge-success">Compliant</span>
                        ) : (
                          <span className="badge badge-warning">Non-compliant</span>
                        )}
                      </div>
                    </dd>
                    <dt>Issues</dt>
                    <dd>
                      {Array.isArray(r.vehicleCompliance.issues) && r.vehicleCompliance.issues.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {r.vehicleCompliance.issues.map((it, i) => {
                            // map known issue codes to human-friendly labels
                            const map = {
                              registrationExpired: 'Registration expired',
                              inspectionExpired: 'Annual inspection expired',
                              registrationMissing: 'Registration missing',
                              inspectionMissing: 'Annual inspection missing',
                            };
                            const label = map[it] || String(it);
                            return (
                              <li key={i} style={{ color: 'var(--text-primary)' }}>{label}</li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="muted">None reported</div>
                      )}
                    </dd>
                    <dt>Registration</dt>
                    <dd>
                      <div className="muted">{formatDate(r.regisExpiry)}</div>
                      <div style={{ marginTop: 8 }}>{expiryBadge(r.regisExpiry)}</div>
                    </dd>
                    <dt>Annual inspection</dt>
                    <dd>
                      <div className="muted">{formatDate(r.annualInspection)}</div>
                      <div style={{ marginTop: 8 }}>{expiryBadge(r.annualInspection)}</div>
                    </dd>
                  </>
                ) : (
                  <>
                    <dt>Registration</dt>
                    <dd>
                      <div className="muted">{formatDate(r.regisExpiry)}</div>
                      <div style={{ marginTop: 8 }}>{expiryBadge(r.regisExpiry)}</div>
                    </dd>
                    <dt>Annual inspection</dt>
                    <dd>
                      <div className="muted">{formatDate(r.annualInspection)}</div>
                      <div style={{ marginTop: 8 }}>{expiryBadge(r.annualInspection)}</div>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
          {/* Render raw DB fields (excluding currentLocation & history) */}
          <div style={{ marginTop: 14 }}>
            {renderRawFields(r.raw)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Active record" subtitle="Read-only view of the active roster entry and expiry highlights">
      <div className="surface">{renderBody()}</div>
    </AppLayout>
  );
};

export default ActivesView;
