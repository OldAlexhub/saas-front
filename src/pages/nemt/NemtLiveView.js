import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { useRealtime } from '../../providers/RealtimeProvider';
import { getNemtLiveRuns } from '../../services/nemtService';

const STATUS_LABEL = {
  Dispatched: 'Dispatched',
  Acknowledged: 'Acknowledged',
  Active: 'Active',
};

const STATUS_CLASS = {
  Dispatched: 'badge bg-warning text-dark',
  Acknowledged: 'badge bg-info text-dark',
  Active: 'badge bg-success',
};

const STATUS_ORDER = ['Active', 'Acknowledged', 'Dispatched'];

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatTime(val) {
  if (!val) return null;
  const d = new Date(val);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function RunCard({ run }) {
  const completed = run.completedCount ?? 0;
  const noshow = run.noShowCount ?? 0;
  const total = run.tripCount ?? 0;
  const pct = total > 0 ? Math.round(((completed + noshow) / total) * 100) : 0;

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-header d-flex align-items-center justify-content-between py-2">
        <span className="fw-semibold">
          <Link to={`/nemt/runs/${run.id}`}>Run {run.runId}</Link>
        </span>
        <span className={STATUS_CLASS[run.status] || 'badge bg-secondary'}>
          {STATUS_LABEL[run.status] || run.status}
        </span>
      </div>
      <div className="card-body py-2 px-3">
        <div className="row g-2 small">
          <div className="col-6">
            <div className="text-muted">Date</div>
            <div>{formatDate(run.serviceDate)}</div>
          </div>
          <div className="col-6">
            <div className="text-muted">Driver</div>
            <div>{run.driverId || '—'}{run.cabNumber ? ` · cab ${run.cabNumber}` : ''}</div>
          </div>
          {run.acknowledgedAt && (
            <div className="col-6">
              <div className="text-muted">Acknowledged</div>
              <div>{formatTime(run.acknowledgedAt)}</div>
            </div>
          )}
          {run.startedAt && (
            <div className="col-6">
              <div className="text-muted">Started</div>
              <div>{formatTime(run.startedAt)}</div>
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>Progress</span>
            <span>{completed + noshow} / {total} trips</span>
          </div>
          <div className="progress" style={{ height: 6 }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${pct}%` }}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {noshow > 0 && (
            <div className="small text-muted mt-1">{noshow} no-show{noshow > 1 ? 's' : ''}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusSection({ status, runs }) {
  if (!runs.length) return null;
  return (
    <div className="mb-4">
      <h6 className="text-uppercase text-muted fw-semibold mb-2" style={{ letterSpacing: '0.05em' }}>
        {STATUS_LABEL[status]} <span className="badge bg-secondary ms-1">{runs.length}</span>
      </h6>
      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
        {runs.map((r) => (
          <div key={r.id} className="col">
            <RunCard run={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NemtLiveView() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const { socket } = useRealtime();
  const fetchInProgress = useRef(false);

  const load = useCallback(async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    try {
      const data = await getNemtLiveRuns();
      setRuns(data.runs || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load live runs.');
    } finally {
      fetchInProgress.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return undefined;

    const refresh = () => load();

    socket.on('nemt:run-dispatched', refresh);
    socket.on('nemt:run-acknowledged', refresh);
    socket.on('nemt:run-started', refresh);
    socket.on('nemt:run-completed', refresh);
    socket.on('nemt:trip-status', refresh);
    socket.on('nemt:trip-cancelled', refresh);
    socket.on('nemt:manifest-updated', refresh);

    return () => {
      socket.off('nemt:run-dispatched', refresh);
      socket.off('nemt:run-acknowledged', refresh);
      socket.off('nemt:run-started', refresh);
      socket.off('nemt:run-completed', refresh);
      socket.off('nemt:trip-status', refresh);
      socket.off('nemt:trip-cancelled', refresh);
      socket.off('nemt:manifest-updated', refresh);
    };
  }, [socket, load]);

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = runs.filter((r) => r.status === s);
    return acc;
  }, {});

  const totalActive = runs.length;

  const actions = (
    <div className="d-flex align-items-center gap-2">
      {lastRefresh && (
        <small className="text-muted">
          Updated {lastRefresh.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </small>
      )}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );

  return (
    <AppLayout
      title="NEMT Live View"
      subtitle={totalActive ? `${totalActive} active run${totalActive !== 1 ? 's' : ''}` : 'No active runs'}
      actions={actions}
    >
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {loading && !runs.length ? (
        <div className="text-center py-5 text-muted">Loading live runs…</div>
      ) : !runs.length ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: 40 }}>🚐</div>
          <div className="mt-2">No runs are currently active.</div>
          <div className="small mt-1">This page refreshes automatically when drivers update their status.</div>
        </div>
      ) : (
        STATUS_ORDER.map((s) => (
          <StatusSection key={s} status={s} runs={grouped[s]} />
        ))
      )}
    </AppLayout>
  );
}
