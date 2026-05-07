import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { autoAssignRuns, listRuns } from '../../services/nemtService';

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const STATUS_OPTIONS = [
  'All', 'Unassigned', 'Assigned', 'Dispatched', 'Acknowledged', 'Active', 'Completed', 'Cancelled',
];

const statusBadge = (status) => {
  if (status === 'Completed') return 'badge-success';
  if (status === 'Cancelled') return 'badge-warning';
  if (['Active', 'Dispatched', 'Acknowledged'].includes(status)) return 'badge-info';
  return 'badge-info';
};

const NemtRuns = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [appliedDates, setAppliedDates] = useState({ from: todayIso, to: todayIso });
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['nemt-runs', appliedDates],
    queryFn: async () => {
      const params = {};
      if (appliedDates.from) params.serviceDate_gte = appliedDates.from;
      if (appliedDates.to) params.serviceDate_lte = appliedDates.to;
      const res = await listRuns(params);
      return res.data?.runs || [];
    },
  });
  const runs = useMemo(() => data ?? [], [data]);

  const applyDates = () => setAppliedDates({ from: fromDate, to: toDate });
  const clearDates = () => {
    setFromDate('');
    setToDate('');
    setAppliedDates({ from: '', to: '' });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
      if (status !== 'All' && r.status !== status) return false;
      if (!q) return true;
      return [r.runId, r.driverId, r.driverName, r.cabNumber?.toString()]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [runs, search, status]);

  const selectedServiceDate = appliedDates.from || fromDate || todayIso;

  const handleAutoAssign = async () => {
    if (!selectedServiceDate) return;
    const confirmed = window.confirm(
      `Automatically assign unassigned NEMT trips for ${selectedServiceDate} to active drivers and optimize each run?`
    );
    if (!confirmed) return;
    setAutoAssigning(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await autoAssignRuns({ serviceDate: selectedServiceDate, commit: true });
      const payload = res.data || {};
      const warningText = Array.isArray(payload.warnings) && payload.warnings.length
        ? ` ${payload.warnings.length} warning(s) need review.`
        : '';
      setActionMsg(`Assigned ${payload.tripCount || 0} trip(s) into ${payload.runCount || 0} run(s).${warningText}`);
      qc.invalidateQueries({ queryKey: ['nemt-runs'] });
      qc.invalidateQueries({ queryKey: ['nemt-trips'] });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Automatic assignment failed.');
    } finally {
      setAutoAssigning(false);
    }
  };

  const actions = (
    <Link to="/nemt/runs/new" className="btn btn-primary">
      <span className="icon">＋</span>New run
    </Link>
  );

  const renderBody = () => {
    if (isLoading) return <div className="skeleton" style={{ height: 260 }} />;
    if (error) return <div className="feedback error">{error.response?.data?.message || 'Failed to load runs.'}</div>;
    if (!filtered.length) return <div className="empty-state">No runs match your filters.</div>;

    return (
      <div className="table-responsive-stack">
        <table className="data-table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Service date</th>
              <th>Driver</th>
              <th>Trips</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td data-label="Run">
                  <span className="primary">{r.runId || r.id?.slice(-6)}</span>
                </td>
                <td data-label="Service date">
                  {r.serviceDate ? new Date(r.serviceDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}
                </td>
                <td data-label="Driver">
                  <div className="table-stack">
                    <span className="primary">{r.driverName || r.driverId || 'Unassigned'}</span>
                    {r.cabNumber && <span className="secondary">Cab #{r.cabNumber}</span>}
                  </div>
                </td>
                <td data-label="Trips">{r.tripCount ?? 0}</td>
                <td data-label="Progress">
                  {r.completedCount ?? 0} done
                  {(r.noShowCount ?? 0) > 0 && ` · ${r.noShowCount} no-show`}
                </td>
                <td data-label="Status">
                  <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span>
                </td>
                <td data-label="Actions">
                  <Link className="pill-button" to={`/nemt/runs/${r.id}`}>Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AppLayout
      title="NEMT Runs"
      subtitle="Driver manifests — group trips into optimized daily runs."
      actions={actions}
    >
      <div className="surface">
        {actionMsg && <div className="feedback success">{actionMsg}</div>}
        {actionError && <div className="feedback error">{actionError}</div>}

        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by run ID or driver"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-input" style={{ width: 160 }}>
              <span className="icon">📅</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="search-input" style={{ width: 160 }}>
              <span className="icon">📅</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button className="btn btn-subtle" type="button" onClick={applyDates}>Apply</button>
            <button className="btn btn-ghost" type="button" onClick={clearDates}>Clear</button>
          </div>

          <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <button type="button" className="btn btn-subtle" onClick={handleAutoAssign} disabled={autoAssigning}>
            {autoAssigning ? 'Assigning...' : 'Auto-assign trips'}
          </button>

          <div className="summary">{filtered.length} of {runs.length} runs</div>
        </div>

        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default NemtRuns;
