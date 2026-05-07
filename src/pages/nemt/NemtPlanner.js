import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import {
  addTripToRun,
  applyRunOptimization,
  autoAssignRuns,
  dispatchRun,
  getRun,
  listRuns,
  listTrips,
  previewRunOptimization,
  removeTripFromRun,
} from '../../services/nemtService';

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const RUN_TERMINAL = new Set(['Completed', 'Cancelled']);
const TRIP_LOCKED = new Set(['EnRoute', 'ArrivedPickup', 'PickedUp', 'ArrivedDrop', 'Completed', 'Cancelled', 'NoShow', 'PassengerCancelled']);

const timeText = (value) => (
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
);

const statusBadge = (status) => {
  if (status === 'Completed') return 'badge-success';
  if (status === 'Cancelled') return 'badge-warning';
  if (['Dispatched', 'Acknowledged', 'Active'].includes(status)) return 'badge-info';
  return 'badge-info';
};

const NemtPlanner = () => {
  const qc = useQueryClient();
  const [serviceDate, setServiceDate] = useState(todayIso);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [tripSearch, setTripSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState(null);

  const dateParams = useMemo(() => ({
    serviceDate_gte: serviceDate,
    serviceDate_lte: serviceDate,
  }), [serviceDate]);

  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['nemt-planner-unassigned', serviceDate],
    queryFn: async () => {
      const res = await listTrips({ ...dateParams, status: 'Scheduled', runId: 'none', limit: 200 });
      return res.data?.trips || [];
    },
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['nemt-planner-runs', serviceDate],
    queryFn: async () => {
      const res = await listRuns({ ...dateParams, limit: 100 });
      return res.data?.runs || [];
    },
  });

  const { data: selectedRun, isLoading: selectedRunLoading } = useQuery({
    queryKey: ['nemt-planner-run', selectedRunId],
    enabled: Boolean(selectedRunId),
    queryFn: async () => {
      const res = await getRun(selectedRunId);
      return res.data?.run || null;
    },
  });

  const unassignedTrips = useMemo(() => tripsData || [], [tripsData]);
  const runs = useMemo(() => runsData || [], [runsData]);

  useEffect(() => {
    if (runs.length && !selectedRunId) setSelectedRunId(runs[0].id);
    if (selectedRunId && !runs.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(runs[0]?.id || '');
    }
  }, [runs, selectedRunId]);

  useEffect(() => {
    setProposal(null);
  }, [selectedRunId]);

  const selectedRunTrips = selectedRun?.trips || [];
  const filteredTrips = unassignedTrips.filter((trip) => {
    const q = tripSearch.trim().toLowerCase();
    if (!q) return true;
    return [trip.tripId, trip.passengerName, trip.pickupAddress, trip.dropoffAddress]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const refreshPlanner = () => {
    qc.invalidateQueries({ queryKey: ['nemt-planner-unassigned'] });
    qc.invalidateQueries({ queryKey: ['nemt-planner-runs'] });
    if (selectedRunId) qc.invalidateQueries({ queryKey: ['nemt-planner-run', selectedRunId] });
    qc.invalidateQueries({ queryKey: ['nemt-runs'] });
    qc.invalidateQueries({ queryKey: ['nemt-trips'] });
  };

  const runAction = async (key, action) => {
    setBusy(key);
    setMessage('');
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.response?.data?.message || 'Planner action failed.');
    } finally {
      setBusy('');
    }
  };

  const handleAddTrip = (tripId) => {
    if (!selectedRunId) {
      setError('Select a run before assigning trips.');
      return;
    }
    runAction(`add-${tripId}`, async () => {
      await addTripToRun(selectedRunId, { tripId });
      setProposal(null);
      setMessage('Trip assigned to selected run.');
      refreshPlanner();
    });
  };

  const handleRemoveTrip = (tripId) => {
    if (!selectedRunId) return;
    runAction(`remove-${tripId}`, async () => {
      await removeTripFromRun(selectedRunId, tripId);
      setProposal(null);
      setMessage('Trip returned to unassigned.');
      refreshPlanner();
    });
  };

  const handleAutoAssign = () => {
    if (!window.confirm(`Auto-assign unassigned trips for ${serviceDate} and optimize affected runs?`)) return;
    runAction('auto', async () => {
      const res = await autoAssignRuns({ serviceDate, commit: true });
      setProposal(null);
      setMessage(`Auto-assigned ${res.data?.tripCount || 0} trip(s) into ${res.data?.runCount || 0} run(s).`);
      refreshPlanner();
    });
  };

  const handlePreview = () => {
    if (!selectedRunId) return;
    runAction('preview', async () => {
      const res = await previewRunOptimization(selectedRunId);
      setProposal(res.data?.proposal || null);
      setMessage(`Optimization proposal ready. ${res.data?.proposal?.changedCount || 0} trip(s) would move.`);
    });
  };

  const handleApplyProposal = () => {
    if (!selectedRunId || !proposal?.orderedIds?.length) return;
    if (!window.confirm('Apply this proposed order to the selected run?')) return;
    runAction('apply', async () => {
      await applyRunOptimization(selectedRunId, { orderedIds: proposal.orderedIds });
      setProposal(null);
      setMessage('Optimization proposal applied.');
      refreshPlanner();
    });
  };

  const handleDispatch = () => {
    if (!selectedRunId) return;
    if (!window.confirm('Dispatch this selected run to its driver now?')) return;
    runAction('dispatch', async () => {
      await dispatchRun(selectedRunId);
      setProposal(null);
      setMessage('Run dispatched to driver.');
      refreshPlanner();
    });
  };

  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      <Link to="/nemt/runs/new" className="btn btn-subtle">New run</Link>
      <Link to="/nemt/trips/new" className="btn btn-primary">New trip</Link>
    </div>
  );

  return (
    <AppLayout
      title="NEMT Planner"
      subtitle="Assign trips to runs, optimize manifests, and dispatch drivers from one board."
      actions={actions}
    >
      <div className="surface">
        {message && <div className="feedback success">{message}</div>}
        {error && <div className="feedback error">{error}</div>}

        <div className="toolbar">
          <div className="search-input" style={{ width: 180 }}>
            <span className="icon">Date</span>
            <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
          </div>
          <button type="button" className="btn btn-subtle" onClick={handleAutoAssign} disabled={busy === 'auto'}>
            {busy === 'auto' ? 'Assigning...' : 'Auto-assign unassigned'}
          </button>
          <div className="summary">
            {unassignedTrips.length} unassigned / {runs.length} run(s)
          </div>
        </div>

        <div
          className="form-grid"
          style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr) minmax(320px, 1.2fr)', alignItems: 'start' }}
        >
          <section className="panel">
            <div className="panel-header">
              <h3>Unassigned trips</h3>
              <span className="badge badge-info">{filteredTrips.length}</span>
            </div>
            <div className="panel-body">
              <div className="search-input" style={{ marginBottom: 12 }}>
                <span className="icon">Search</span>
                <input
                  type="search"
                  placeholder="Passenger, trip ID, address"
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                />
              </div>
              {tripsLoading ? (
                <div className="skeleton" style={{ height: 160 }} />
              ) : filteredTrips.length === 0 ? (
                <div className="empty-state">No unassigned scheduled trips for this date.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 640, overflow: 'auto' }}>
                  {filteredTrips.map((trip) => (
                    <div key={trip.id} className="panel" style={{ margin: 0 }}>
                      <div className="panel-body">
                        <div className="table-stack">
                          <span className="primary">#{trip.tripId || trip.id?.slice(-6)} - {trip.passengerName || 'Passenger'}</span>
                          <span className="secondary">{timeText(trip.scheduledPickupTime)} pickup</span>
                          <span className="secondary">{trip.mobilityType || 'ambulatory'} / riders {(trip.passengerCount || 1) + (trip.attendantCount || 0)}</span>
                          <span className="secondary">{trip.pickupAddress || '-'}</span>
                        </div>
                      </div>
                      <div className="panel-footer">
                        <button
                          type="button"
                          className="pill-button"
                          onClick={() => handleAddTrip(trip.id)}
                          disabled={!selectedRunId || busy === `add-${trip.id}`}
                        >
                          {busy === `add-${trip.id}` ? 'Adding...' : 'Add to selected run'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Runs</h3>
              <span className="badge badge-info">{runs.length}</span>
            </div>
            <div className="panel-body">
              {runsLoading ? (
                <div className="skeleton" style={{ height: 160 }} />
              ) : runs.length === 0 ? (
                <div className="empty-state">No runs for this date. Create a run first.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 700, overflow: 'auto' }}>
                  {runs.map((run) => {
                    const selected = run.id === selectedRunId;
                    return (
                      <button
                        type="button"
                        key={run.id}
                        className="panel"
                        style={{
                          margin: 0,
                          textAlign: 'left',
                          width: '100%',
                          borderColor: selected ? 'var(--accent-strong)' : 'var(--surface-border)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        <div className="panel-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <div className="table-stack">
                              <span className="primary">Run {run.runId || run.id?.slice(-6)}</span>
                              <span className="secondary">{run.driverName || run.driverId || 'Unassigned driver'}</span>
                              {run.cabNumber && <span className="secondary">Cab #{run.cabNumber}</span>}
                            </div>
                            <span className={`badge ${statusBadge(run.status)}`}>{run.status}</span>
                          </div>
                          <div className="summary" style={{ marginTop: 8 }}>
                            {run.tripCount || 0} trip(s), {run.completedCount || 0} completed
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Selected manifest</h3>
              {selectedRun && <span className={`badge ${statusBadge(selectedRun.status)}`}>{selectedRun.status}</span>}
            </div>
            <div className="panel-body">
              {!selectedRunId ? (
                <div className="empty-state">Select a run to manage its manifest.</div>
              ) : selectedRunLoading ? (
                <div className="skeleton" style={{ height: 220 }} />
              ) : !selectedRun ? (
                <div className="empty-state">Run not found.</div>
              ) : (
                <>
                  <div className="toolbar" style={{ padding: 0, marginBottom: 12 }}>
                    <button
                      type="button"
                      className="btn btn-subtle"
                      onClick={handlePreview}
                      disabled={busy === 'preview' || selectedRunTrips.length < 2 || RUN_TERMINAL.has(selectedRun.status)}
                    >
                      {busy === 'preview' ? 'Previewing...' : 'Preview optimize'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleDispatch}
                      disabled={
                        busy === 'dispatch' ||
                        !['Assigned', 'Unassigned'].includes(selectedRun.status) ||
                        selectedRunTrips.length === 0 ||
                        !selectedRun.driverId
                      }
                    >
                      {busy === 'dispatch' ? 'Dispatching...' : 'Dispatch'}
                    </button>
                    <Link className="pill-button" to={`/nemt/runs/${selectedRun.id}`}>Detail</Link>
                  </div>

                  {proposal && (
                    <div className="feedback warning" style={{ marginBottom: 12 }}>
                      Proposal ready: {proposal.changedCount || 0} stop(s) would move.
                      {proposal.requiresApproval ? ' Already-dispatched manifest requires approval before applying.' : ''}
                      <div style={{ marginTop: 8 }}>
                        <button type="button" className="btn btn-primary" onClick={handleApplyProposal} disabled={busy === 'apply'}>
                          {busy === 'apply' ? 'Applying...' : 'Apply proposal'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedRunTrips.length === 0 ? (
                    <div className="empty-state">No trips assigned to this run.</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Trip</th>
                          <th>Pickup</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRunTrips.map((trip, idx) => {
                          const locked = TRIP_LOCKED.has(trip.status);
                          return (
                            <tr key={trip.id}>
                              <td>{idx + 1}</td>
                              <td>
                                <div className="table-stack">
                                  <span className="primary">#{trip.tripId || trip.id?.slice(-6)}</span>
                                  <span className="secondary">{trip.passengerName || '-'}</span>
                                  <span className="secondary">{trip.mobilityType || 'ambulatory'}</span>
                                </div>
                              </td>
                              <td>
                                <div className="table-stack">
                                  <span className="primary">{timeText(trip.scheduledPickupTime)}</span>
                                  <span className="secondary">{trip.pickupAddress || '-'}</span>
                                </div>
                              </td>
                              <td>
                                {!locked && !RUN_TERMINAL.has(selectedRun.status) && (
                                  <button
                                    type="button"
                                    className="pill-button"
                                    onClick={() => handleRemoveTrip(trip.id)}
                                    disabled={busy === `remove-${trip.id}`}
                                  >
                                    {busy === `remove-${trip.id}` ? 'Removing...' : 'Remove'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default NemtPlanner;
