import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import api from '../../services/api';

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtInt = (n) => Number(n || 0).toLocaleString();

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: 'Last 7 days', from: daysAgo(6), to: today() },
  { label: 'Last 30 days', from: daysAgo(29), to: today() },
  { label: 'Last 90 days', from: daysAgo(89), to: today() },
];

const FinancialReport = () => {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [driverId, setDriverId] = useState('');
  const [submitted, setSubmitted] = useState({ from: daysAgo(29), to: today(), driverId: '' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['financial-report', submitted.from, submitted.to, submitted.driverId],
    queryFn: async () => {
      const params = new URLSearchParams({ from: submitted.from, to: submitted.to });
      if (submitted.driverId) params.set('driverId', submitted.driverId);
      const res = await api.get(`/reports/financials?${params}`);
      return res.data;
    },
    staleTime: 60_000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted({ from, to, driverId });
  };

  const applyPreset = (p) => {
    setFrom(p.from);
    setTo(p.to);
    setSubmitted({ from: p.from, to: p.to, driverId });
  };

  return (
    <AppLayout title="Financial Report" subtitle="Revenue, trip counts, and earnings by driver for standard dispatch.">
      <div className="surface" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSubmit}>
          <div className="toolbar" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="form-grid" style={{ maxWidth: 640 }}>
            <div>
              <label htmlFor="fr-from">From</label>
              <input id="fr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="fr-to">To</label>
              <input id="fr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="fr-driver">Driver ID <span style={{ color: 'var(--text-secondary)' }}>(optional)</span></label>
              <input id="fr-driver" type="text" value={driverId} onChange={(e) => setDriverId(e.target.value)} placeholder="Filter by driver" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Loading…' : 'Run report'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isError && (
        <div className="feedback error" style={{ marginBottom: 16 }}>
          Failed to load report.{' '}
          <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem', marginLeft: 8 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <SummaryCard label="Total revenue" value={fmt(data.summary.totalRevenue)} highlight />
            <SummaryCard label="Completed trips" value={fmtInt(data.summary.completedTrips)} />
            <SummaryCard label="Average fare" value={fmt(data.summary.avgFare)} />
            <SummaryCard label="Cancelled" value={fmtInt(data.summary.cancelledTrips)} />
            <SummaryCard label="No-show" value={fmtInt(data.summary.noShowTrips)} />
          </div>

          {/* By driver */}
          {data.byDriver.length > 0 && (
            <div className="surface" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Revenue by driver</h3>
              <div className="table-responsive-stack">
                <table className="data-table">
                  <thead>
                    <tr><th>Driver</th><th>Driver ID</th><th>Trips</th><th>Revenue</th><th>Avg fare</th></tr>
                  </thead>
                  <tbody>
                    {data.byDriver.map((d) => (
                      <tr key={d.driverId}>
                        <td data-label="Driver">{d.driverName}</td>
                        <td data-label="Driver ID">{d.driverId}</td>
                        <td data-label="Trips">{fmtInt(d.trips)}</td>
                        <td data-label="Revenue"><strong>{fmt(d.revenue)}</strong></td>
                        <td data-label="Avg fare">{fmt(d.avgFare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By day */}
          {data.byDay.length > 0 && (
            <div className="surface">
              <h3 style={{ marginBottom: 16 }}>Daily breakdown</h3>
              <div className="table-responsive-stack">
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Trips</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {data.byDay.map((d) => (
                      <tr key={d.date}>
                        <td data-label="Date">{d.date}</td>
                        <td data-label="Trips">{fmtInt(d.trips)}</td>
                        <td data-label="Revenue"><strong>{fmt(d.revenue)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td><strong>{fmtInt(data.summary.completedTrips)}</strong></td>
                      <td><strong>{fmt(data.summary.totalRevenue)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {data.byDriver.length === 0 && data.byDay.length === 0 && (
            <div className="empty-state">No completed trips found in this date range.</div>
          )}
        </>
      )}
    </AppLayout>
  );
};

function SummaryCard({ label, value, highlight }) {
  return (
    <div className="panel" style={{ padding: '18px 20px' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default FinancialReport;
