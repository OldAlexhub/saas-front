import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import {
  getNemtOtpReport,
  getNemtTripReport,
  getNemtDriverActivityReport,
  getNemtAgencyBillingReport,
  getNemtRunsReport,
  getNemtCancellationsReport,
  getNemtImportQualityReport,
  getNemtProofOfServiceReport,
} from '../../services/nemtService';

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
const fromDefault = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

const DATE_PRESETS = [
  { label: 'Today', from: todayIso, to: todayIso },
  { label: '7 days', from: (() => { const d = new Date(now.getTime() - 6 * 86400000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(), to: todayIso },
  { label: '30 days', from: fromDefault, to: todayIso },
  { label: 'Month', from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to: todayIso },
];

const TABS = [
  { key: 'otp', label: 'On-Time Performance' },
  { key: 'trips', label: 'Trip Log' },
  { key: 'drivers', label: 'Driver Activity' },
  { key: 'billing', label: 'Agency Billing' },
  { key: 'runs', label: 'Runs' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'import_quality', label: 'Import Quality' },
  { key: 'proof_of_service', label: 'Proof of Service' },
];

const OTP_COLORS = {
  early: '#38bdf8',
  on_time: '#4ade80',
  late: '#facc15',
  very_late: '#f87171',
  no_data: '#94a3b8',
};

const pct = (n, total) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—');
const fmt = (n) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');

// --- OTP Tab ---
const OtpTab = ({ from, to }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtOtpReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <>
          {/* Summary */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><h3>Summary</h3></div>
            <div className="panel-body">
              <dl className="meta-grid">
                <div><dt>Total trips</dt><dd>{data.totalTrips}</dd></div>
                <div><dt>Completed</dt><dd>{data.totalCompleted}</dd></div>
                <div><dt>No-show</dt><dd>{data.totalNoShow}</dd></div>
                <div><dt>On-time %</dt><dd style={{ color: '#4ade80' }}>{data.onTimePct != null ? `${data.onTimePct}%` : '—'}</dd></div>
                {data.settings && (
                  <>
                    <div><dt>On-time threshold</dt><dd>≤ {data.settings.otpOnTimeMaxMinutes} min late</dd></div>
                    <div><dt>Late threshold</dt><dd>≤ {data.settings.otpLateMaxMinutes} min late</dd></div>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* Overall breakdown */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><h3>Overall OTP breakdown</h3></div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Object.entries(data.overall).map(([k, v]) => (
                  <div key={k} style={{ textAlign: 'center', minWidth: 100, background: 'var(--surface-highlight)', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: OTP_COLORS[k] }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'capitalize' }}>{k.replace('_', ' ')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pct(v, data.totalCompleted)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* By agency */}
          {data.byAgency.length > 0 && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>By agency</h3></div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Agency</th><th>Total</th><th>Early</th><th>On time</th><th>Late</th><th>Very late</th><th>No data</th><th>On-time %</th></tr>
                  </thead>
                  <tbody>
                    {data.byAgency.map((a) => (
                      <tr key={a.agencyId}>
                        <td>{a.agencyId}</td>
                        <td>{a.total}</td>
                        <td style={{ color: OTP_COLORS.early }}>{a.early}</td>
                        <td style={{ color: OTP_COLORS.on_time }}>{a.on_time}</td>
                        <td style={{ color: OTP_COLORS.late }}>{a.late}</td>
                        <td style={{ color: OTP_COLORS.very_late }}>{a.very_late}</td>
                        <td>{a.no_data}</td>
                        <td style={{ fontWeight: 700 }}>{pct((a.early || 0) + (a.on_time || 0), a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By day */}
          {data.byDay.length > 0 && (
            <div className="panel">
              <div className="panel-header"><h3>By day</h3></div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Total</th><th>Early</th><th>On time</th><th>Late</th><th>Very late</th><th>On-time %</th></tr>
                  </thead>
                  <tbody>
                    {data.byDay.map((d) => (
                      <tr key={d.date}>
                        <td>{d.date}</td>
                        <td>{d.total}</td>
                        <td style={{ color: OTP_COLORS.early }}>{d.early}</td>
                        <td style={{ color: OTP_COLORS.on_time }}>{d.on_time}</td>
                        <td style={{ color: OTP_COLORS.late }}>{d.late}</td>
                        <td style={{ color: OTP_COLORS.very_late }}>{d.very_late}</td>
                        <td style={{ fontWeight: 700 }}>{pct((d.early || 0) + (d.on_time || 0), d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Trip Log Tab ---
const TripLogTab = ({ from, to }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState('1000');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtTripReport({ from, to, limit });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!data?.trips?.length) return;
    const cols = [
      'tripId','agencyId','agencyTripRef','serviceDate','passengerName','mobilityType',
      'status','otpStatus','scheduledVsActualMinutes','actualMiles',
      'pickupAddress','dropoffAddress','scheduledPickupTime','appointmentTime',
      'driverId','cabNumber','runId','runSequence',
      'agencyFare','billingStatus','driverPay','payStatus',
      'cancelReason','noShowReason',
    ];
    const header = cols.join(',');
    const rows = data.trips.map((t) =>
      cols.map((c) => {
        const v = t[c];
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nemt-trips-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-input" style={{ width: 120 }}>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Limit" min="1" max="5000" />
        </div>
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run report'}
        </button>
        {data && (
          <button type="button" className="btn btn-subtle" onClick={exportCsv}>Export CSV</button>
        )}
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <div className="panel">
          <div className="panel-header">
            <h3>Trip log</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data.count} rows</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {data.trips.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>No trips in this date range.</div>
            ) : (
              <div className="table-responsive-stack">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trip</th><th>Date</th><th>Passenger</th><th>Status</th><th>OTP</th>
                      <th>Min late</th><th>Pickup</th><th>Dropoff</th>
                      <th>Driver</th><th>Agency fare</th><th>Driver pay</th><th>Bill status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trips.map((t) => (
                      <tr key={t.tripId}>
                        <td data-label="Trip">#{t.tripId}</td>
                        <td data-label="Date">{t.serviceDate}</td>
                        <td data-label="Passenger">
                          <div className="table-stack">
                            <span className="primary">{t.passengerName}</span>
                            <span className="secondary">{t.mobilityType}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${t.status === 'Completed' ? 'badge-success' : ['Cancelled','NoShow','PassengerCancelled'].includes(t.status) ? 'badge-warning' : 'badge-info'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td data-label="OTP" style={{ color: OTP_COLORS[t.otpStatus] }}>
                          {t.otpStatus ? t.otpStatus.replace('_', ' ') : '—'}
                        </td>
                        <td data-label="Min late">
                          {t.scheduledVsActualMinutes != null ? `${t.scheduledVsActualMinutes > 0 ? '+' : ''}${t.scheduledVsActualMinutes}` : '—'}
                        </td>
                        <td data-label="Pickup">{t.pickupAddress}</td>
                        <td data-label="Dropoff">{t.dropoffAddress}</td>
                        <td data-label="Driver">{t.driverId || '—'}</td>
                        <td data-label="Agency fare">{t.agencyFare != null ? fmt(t.agencyFare) : '—'}</td>
                        <td data-label="Driver pay">{t.driverPay != null ? fmt(t.driverPay) : '—'}</td>
                        <td data-label="Bill status">{t.billingStatus || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Driver Activity Tab ---
const DriverActivityTab = ({ from, to }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtDriverActivityReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <div className="panel">
          <div className="panel-header">
            <h3>Driver activity</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data.driverCount} drivers</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {data.drivers.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>No driver activity in this period.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Driver</th><th>Total</th><th>Completed</th><th>No-show</th><th>Cancelled</th>
                    <th>Completion %</th><th>Avg delay</th><th>Total pay</th><th>Paid</th><th>Pending</th><th>Miles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.drivers.map((d) => (
                    <tr key={d.driverId}>
                      <td data-label="Driver">{d.driverId}</td>
                      <td data-label="Total">{d.totalTrips}</td>
                      <td data-label="Completed" style={{ color: '#4ade80' }}>{d.completed}</td>
                      <td data-label="No-show" style={{ color: '#f87171' }}>{d.noShow}</td>
                      <td data-label="Cancelled">{d.cancelled}</td>
                      <td data-label="Completion %">{d.completionRate != null ? `${d.completionRate}%` : '—'}</td>
                      <td data-label="Avg delay">
                        {d.avgPickupDelayMinutes != null
                          ? `${d.avgPickupDelayMinutes > 0 ? '+' : ''}${d.avgPickupDelayMinutes} min`
                          : '—'}
                      </td>
                      <td data-label="Total pay">{fmt(d.totalPay)}</td>
                      <td data-label="Paid" style={{ color: '#4ade80' }}>{fmt(d.paidPay)}</td>
                      <td data-label="Pending" style={{ color: '#facc15' }}>{fmt(d.unpaidPay)}</td>
                      <td data-label="Miles">{d.totalMiles > 0 ? `${d.totalMiles.toFixed(1)} mi` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Agency Billing Tab ---
const AgencyBillingTab = ({ from, to }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtAgencyBillingReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <div className="panel">
          <div className="panel-header">
            <h3>Agency billing reconciliation</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data.agencyCount} agencies</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {data.agencies.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>No billing data in this period.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agency</th><th>Trips</th><th>Completed</th><th>No-show</th>
                    <th>Total fare</th><th>Billed</th><th>Unbilled</th><th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agencies.map((a) => (
                    <tr key={a.agencyId}>
                      <td data-label="Agency">{a.agencyId}</td>
                      <td data-label="Trips">{a.totalTrips}</td>
                      <td data-label="Completed">{a.completedTrips}</td>
                      <td data-label="No-show">{a.noShowTrips}</td>
                      <td data-label="Total fare" style={{ fontWeight: 700 }}>{fmt(a.totalFare)}</td>
                      <td data-label="Billed">{fmt(a.billedFare)}</td>
                      <td data-label="Unbilled" style={{ color: a.unbilledFare > 0 ? '#facc15' : undefined }}>
                        {fmt(a.unbilledFare)}
                      </td>
                      <td data-label="Paid" style={{ color: '#4ade80' }}>{fmt(a.paidFare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Runs Tab ---
const RunsTab = ({ from, to }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtRunsReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <>
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><h3>Summary</h3></div>
            <div className="panel-body">
              <dl className="meta-grid">
                <div><dt>Total runs</dt><dd>{data.total}</dd></div>
                <div><dt>Completed</dt><dd style={{ color: '#4ade80' }}>{data.completed}</dd></div>
                <div><dt>Active</dt><dd style={{ color: '#38bdf8' }}>{data.active}</dd></div>
                <div><dt>Dispatched</dt><dd style={{ color: '#facc15' }}>{data.dispatched}</dd></div>
                <div><dt>Acknowledged</dt><dd style={{ color: '#a78bfa' }}>{data.acknowledged}</dd></div>
                <div><dt>Cancelled</dt><dd style={{ color: '#f87171' }}>{data.cancelled}</dd></div>
              </dl>
            </div>
          </div>
          {data.runs.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h3>Run detail</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data.runs.length} runs</span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Run</th><th>Date</th><th>Driver</th><th>Status</th>
                      <th>Trips</th><th>Done</th><th>No-show</th><th>Completion</th><th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <tr key={r.runId}>
                        <td>#{r.runId}</td>
                        <td>{r.serviceDate}</td>
                        <td>{r.driverId || '—'}{r.cabNumber ? ` · ${r.cabNumber}` : ''}</td>
                        <td><span className={`badge ${r.status === 'Completed' ? 'badge-success' : r.status === 'Cancelled' ? 'badge-warning' : 'badge-info'}`}>{r.status}</span></td>
                        <td>{r.tripCount}</td>
                        <td style={{ color: '#4ade80' }}>{r.completedCount}</td>
                        <td style={{ color: '#f87171' }}>{r.noShowCount}</td>
                        <td>{r.completionPct != null ? `${r.completionPct}%` : '—'}</td>
                        <td>{r.durationMinutes != null ? `${r.durationMinutes} min` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Cancellations Tab ---
const CancellationsTab = ({ from, to }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtCancellationsReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <>
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><h3>Summary</h3></div>
            <div className="panel-body">
              <dl className="meta-grid">
                <div><dt>Total</dt><dd>{data.total}</dd></div>
                <div><dt>Cancelled (dispatch)</dt><dd style={{ color: '#f87171' }}>{data.byStatus.Cancelled || 0}</dd></div>
                <div><dt>No-show</dt><dd style={{ color: '#facc15' }}>{data.byStatus.NoShow || 0}</dd></div>
                <div><dt>Passenger cancelled</dt><dd style={{ color: '#fb923c' }}>{data.byStatus.PassengerCancelled || 0}</dd></div>
              </dl>
            </div>
          </div>

          {data.byDriver.length > 0 && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>By driver</h3></div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Driver</th><th>Cancelled</th><th>No-show</th><th>Pax cancelled</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {data.byDriver.map((d) => (
                      <tr key={d.driverId}>
                        <td>{d.driverId}</td>
                        <td style={{ color: '#f87171' }}>{d.cancelled}</td>
                        <td style={{ color: '#facc15' }}>{d.noShow}</td>
                        <td style={{ color: '#fb923c' }}>{d.passengerCancelled}</td>
                        <td style={{ fontWeight: 700 }}>{d.cancelled + d.noShow + d.passengerCancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.trips.length > 0 && (
            <div className="panel">
              <div className="panel-header"><h3>Trip detail</h3></div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Trip</th><th>Date</th><th>Passenger</th><th>Status</th><th>Driver</th><th>Cancelled by</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {data.trips.map((t) => (
                      <tr key={t.tripId}>
                        <td>#{t.tripId}</td>
                        <td>{t.serviceDate}</td>
                        <td>{t.passengerName}</td>
                        <td>
                          <span className={`badge ${t.status === 'NoShow' ? 'badge-warning' : 'badge-subtle'}`}>{t.status}</span>
                        </td>
                        <td>{t.driverId || '—'}</td>
                        <td>{t.cancelledBy || '—'}</td>
                        <td>{t.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Main NemtReports ---
const NemtReports = () => {
  const [tab, setTab] = useState('otp');
  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(todayIso);
  const [appliedFrom, setAppliedFrom] = useState(fromDefault);
  const [appliedTo, setAppliedTo] = useState(todayIso);

  const applyPreset = (preset) => {
    setFrom(preset.from);
    setTo(preset.to);
    setAppliedFrom(preset.from);
    setAppliedTo(preset.to);
  };

  const applyDates = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  return (
    <AppLayout
      title="NEMT Reports"
      subtitle="On-time performance, trip log, driver activity, and agency billing."
    >
      <div className="surface">
        {/* Date range controls */}
        <div className="toolbar" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn btn-ghost"
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-input" style={{ width: 160 }}>
              <span className="icon">📅</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="search-input" style={{ width: 160 }}>
              <span className="icon">📅</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button type="button" className="btn btn-subtle" onClick={applyDates}>Apply</button>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {appliedFrom} → {appliedTo}
          </span>
        </div>

        {/* Report tabs */}
        <div className="toolbar" style={{ marginBottom: 24 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'otp' && <OtpTab from={appliedFrom} to={appliedTo} />}
        {tab === 'trips' && <TripLogTab from={appliedFrom} to={appliedTo} />}
        {tab === 'drivers' && <DriverActivityTab from={appliedFrom} to={appliedTo} />}
        {tab === 'billing' && <AgencyBillingTab from={appliedFrom} to={appliedTo} />}
        {tab === 'runs' && <RunsTab from={appliedFrom} to={appliedTo} />}
        {tab === 'cancellations' && <CancellationsTab from={appliedFrom} to={appliedTo} />}
        {tab === 'import_quality' && <ImportQualityTab from={appliedFrom} to={appliedTo} />}
        {tab === 'proof_of_service' && <ProofOfServiceTab from={appliedFrom} to={appliedTo} />}
      </div>
    </AppLayout>
  );
};

export default NemtReports;

// --- Import Quality Tab ---
function ImportQualityTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtImportQualityReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Loading…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <>
          <div className="stats-row" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              ['Total batches', data.totals.totalBatches],
              ['Committed', data.totals.committed],
              ['Partial', data.totals.partiallyCommitted],
              ['Cancelled', data.totals.cancelled],
              ['Total rows', data.totals.totalRows],
              ['Valid rows', data.totals.validRows],
              ['Warning rows', data.totals.warningRows],
              ['Error rows', data.totals.errorRows],
              ['Imported', data.totals.importedRows],
              ['Skipped', data.totals.skippedRows],
            ].map(([label, val]) => (
              <div key={label} className="stat-chip" style={{ minWidth: 100, padding: '8px 14px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{val ?? '—'}</div>
              </div>
            ))}
          </div>
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Batch ID</th><th>Agency</th><th>Service date</th><th>Status</th>
                <th>File</th><th>Rows</th><th>Valid</th><th>Warn</th><th>Err</th>
                <th>Imported</th><th>Quality %</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.batches.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{b.batchId}</td>
                  <td>{b.agencyId}</td>
                  <td>{b.serviceDate || '—'}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: b.status === 'committed' ? '#4ade8033' : b.status === 'cancelled' ? '#f8717133' : '#facc1533',
                      color: b.status === 'committed' ? '#4ade80' : b.status === 'cancelled' ? '#f87171' : '#facc15',
                    }}>{b.status}</span>
                  </td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.sourceFileName || '—'}</td>
                  <td>{b.totalRows}</td>
                  <td style={{ color: '#4ade80' }}>{b.validRows}</td>
                  <td style={{ color: '#facc15' }}>{b.warningRows}</td>
                  <td style={{ color: '#f87171' }}>{b.errorRows}</td>
                  <td>{b.importedRows}</td>
                  <td>{b.qualityPct != null ? `${b.qualityPct}%` : '—'}</td>
                  <td style={{ fontSize: 11 }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// --- Proof of Service Tab ---
function ProofOfServiceTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNemtProofOfServiceReport({ from, to });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? 'Loading…' : 'Run report'}
        </button>
      </div>
      {error && <div className="feedback error">{error}</div>}
      {data && (
        <>
          <div className="stats-row" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              ['Total trips', data.totals.total],
              ['Has pickup GPS', data.totals.hasPickupGps],
              ['Has dropoff GPS', data.totals.hasDropoffGps],
              ['Has no-show GPS', data.totals.hasNoShowGps],
              ['Has driver note', data.totals.hasDriverNote],
              ['Flagged issues', data.totals.hasFlaggedIssue],
              ['Missing pickup GPS', data.totals.missingPickupGps],
              ['Missing dropoff GPS', data.totals.missingDropoffGps],
            ].map(([label, val]) => (
              <div key={label} className="stat-chip" style={{ minWidth: 120, padding: '8px 14px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{val ?? '—'}</div>
              </div>
            ))}
          </div>
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Trip #</th><th>Date</th><th>Passenger</th><th>Status</th><th>Driver</th>
                <th>Pickup GPS</th><th>Dropoff GPS</th><th>No-show GPS</th><th>Note</th><th>Flagged</th>
              </tr>
            </thead>
            <tbody>
              {data.trips.map((t) => (
                <tr key={t.tripId} style={(!t.hasPickupGps && t.status === 'Completed') ? { background: '#f8717111' } : undefined}>
                  <td>{t.tripId}</td>
                  <td>{t.serviceDate || '—'}</td>
                  <td>{t.passengerName}</td>
                  <td>{t.status}</td>
                  <td>{t.driverId || '—'}</td>
                  <td style={{ color: t.hasPickupGps ? '#4ade80' : '#f87171' }}>{t.hasPickupGps ? 'Yes' : 'Missing'}</td>
                  <td style={{ color: t.hasDropoffGps ? '#4ade80' : t.status === 'Completed' ? '#f87171' : '#94a3b8' }}>
                    {t.status === 'Completed' ? (t.hasDropoffGps ? 'Yes' : 'Missing') : '—'}
                  </td>
                  <td style={{ color: t.hasNoShowGps ? '#4ade80' : '#94a3b8' }}>
                    {t.status === 'NoShow' ? (t.hasNoShowGps ? 'Yes' : '—') : '—'}
                  </td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.driverNote || '—'}
                  </td>
                  <td style={{ color: t.hasFlaggedIssue ? '#f87171' : undefined }}>
                    {t.hasFlaggedIssue ? 'Yes' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
