import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import {
  getRun, updateRun, reorderRun, addTripToRun, removeTripFromRun,
  optimizeRun, dispatchRun, cancelRun, listTrips,
} from '../../services/nemtService';
import { listActives } from '../../services/activeService';

const TERMINAL_RUN = new Set(['Completed', 'Cancelled']);
const TERMINAL_TRIP = new Set(['Completed', 'Cancelled', 'NoShow', 'PassengerCancelled']);

const statusBadge = (status) => {
  if (status === 'Completed') return 'badge-success';
  if (status === 'Cancelled') return 'badge-warning';
  if (['Active', 'Dispatched', 'Acknowledged'].includes(status)) return 'badge-info';
  return 'badge-info';
};

const tripStatusBadge = (status) => {
  if (status === 'Completed') return 'badge-success';
  if (['Cancelled', 'NoShow', 'PassengerCancelled'].includes(status)) return 'badge-warning';
  return 'badge-info';
};

const NemtRunDetail = () => {
  const { id } = useParams();

  const [run, setRun] = useState(null);
  const [trips, setTrips] = useState([]);
  const [actives, setActives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit run meta
  const [metaForm, setMetaForm] = useState({ driverId: '', cabNumber: '', notes: '' });
  const [metaSaving, setMetaSaving] = useState(false);

  // Add-trip panel
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [unassigned, setUnassigned] = useState([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [addingTrip, setAddingTrip] = useState(null);

  // Cancel run
  const [cancelReason, setCancelReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRun = useCallback(async () => {
    try {
      const res = await getRun(id);
      const r = res.data?.run || res.data;
      setRun(r);
      setTrips(r.trips || []);
      setMetaForm({
        driverId: r.driverId || '',
        cabNumber: r.cabNumber ? String(r.cabNumber) : '',
        notes: r.notes || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load run.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadRun(),
      listActives().then((res) => {
        const list = res.data?.data || res.data?.actives || res.data || [];
        setActives(Array.isArray(list) ? list : []);
      }),
    ]).finally(() => setLoading(false));
  }, [loadRun]);

  // Load unassigned trips when add-trip panel opens
  useEffect(() => {
    if (!showAddTrip || !run?.serviceDate) return;
    setUnassignedLoading(true);
    const date = new Date(run.serviceDate).toISOString().substring(0, 10);
    listTrips({ serviceDate_gte: date, serviceDate_lte: date, status: 'Scheduled' })
      .then((res) => setUnassigned(res.data?.trips || []))
      .catch(() => setUnassigned([]))
      .finally(() => setUnassignedLoading(false));
  }, [showAddTrip, run?.serviceDate]);

  const driverOptions = actives.map((a) => {
    const value = a.driverId ?? a._id;
    if (!value) return null;
    const name = `${a.firstName || ''} ${a.lastName || ''}`.trim() || String(value);
    return { value: String(value), label: a.cabNumber ? `${name} — Cab ${a.cabNumber}` : name };
  }).filter(Boolean);

  const isTerminalRun = run ? TERMINAL_RUN.has(run.status) : false;
  const canDispatch = run && !isTerminalRun && ['Assigned', 'Unassigned'].includes(run.status) && trips.length > 0;

  const setMeta = (field) => (e) => {
    if (field === 'driverId') {
      const match = actives.find((a) => String(a.driverId ?? a._id) === e.target.value);
      setMetaForm((prev) => ({
        ...prev,
        driverId: e.target.value,
        cabNumber: match?.cabNumber ? String(match.cabNumber) : prev.cabNumber,
      }));
    } else {
      setMetaForm((prev) => ({ ...prev, [field]: e.target.value }));
    }
  };

  const handleSaveMeta = async (e) => {
    e.preventDefault();
    setMetaSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await updateRun(id, {
        driverId: metaForm.driverId || undefined,
        cabNumber: metaForm.cabNumber || undefined,
        notes: metaForm.notes || undefined,
      });
      setRun((prev) => ({ ...prev, ...(res.data?.run || {}) }));
      setMessage('Run updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setMetaSaving(false);
    }
  };

  const moveTrip = async (index, direction) => {
    const newTrips = [...trips];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newTrips.length) return;
    [newTrips[index], newTrips[swapIndex]] = [newTrips[swapIndex], newTrips[index]];
    setTrips(newTrips);
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await reorderRun(id, { tripIds: newTrips.map((t) => t.id) });
      setMessage('Order saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Reorder failed.');
      await loadRun();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTrip = async (tripId) => {
    if (!window.confirm('Remove this trip from the run?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await removeTripFromRun(id, tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      setMessage('Trip removed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrip = async (tripId) => {
    setAddingTrip(tripId);
    setMessage('');
    setError('');
    try {
      const res = await addTripToRun(id, { tripId });
      const updatedRun = res.data?.run;
      if (updatedRun) {
        setRun(updatedRun);
        setTrips(updatedRun.trips || []);
      } else {
        await loadRun();
      }
      setUnassigned((prev) => prev.filter((t) => t.id !== tripId));
      setMessage('Trip added to run.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add trip.');
    } finally {
      setAddingTrip(null);
    }
  };

  const handleOptimize = async () => {
    if (!window.confirm('Re-optimize the trip order? Locked (in-progress) trips will not move.')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await optimizeRun(id);
      const updatedRun = res.data?.run;
      if (updatedRun) {
        setRun(updatedRun);
        setTrips(updatedRun.trips || []);
      } else {
        await loadRun();
      }
      setMessage(`Optimized. ${res.data?.optimizedCount ?? ''} trips resequenced.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Optimization failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async () => {
    if (!window.confirm('Dispatch this run to the driver now?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await dispatchRun(id);
      const updatedRun = res.data?.run;
      setRun((prev) => ({ ...prev, ...(updatedRun || { status: 'Dispatched' }) }));
      setMessage('Run dispatched to driver.');
    } catch (err) {
      setError(err.response?.data?.message || 'Dispatch failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRun = async () => {
    if (!window.confirm('Cancel this entire run? All unstarted trips will be cancelled.')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await cancelRun(id, { reason: cancelReason || undefined });
      const updatedRun = res.data?.run;
      setRun((prev) => ({ ...prev, ...(updatedRun || { status: 'Cancelled' }) }));
      await loadRun();
      setMessage('Run cancelled.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel run.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUnassigned = unassigned.filter((t) => {
    const q = tripSearch.trim().toLowerCase();
    if (!q) return true;
    return [t.tripId, t.passengerName, t.pickupAddress, t.dropoffAddress]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const actions = <Link to="/nemt/runs" className="btn btn-ghost">Back to runs</Link>;

  if (loading) {
    return (
      <AppLayout title="NEMT Run" actions={actions}>
        <div className="surface"><div className="skeleton" style={{ height: 400 }} /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Run ${run?.runId || id?.slice(-6) || ''}`}
      subtitle={run?.serviceDate ? `Service date: ${new Date(run.serviceDate).toLocaleDateString()}` : 'NEMT run manifest'}
      actions={actions}
    >
      <div className="surface">
        {message && <div className="feedback success">{message}</div>}
        {error && <div className="feedback error">{error}</div>}

        {/* Run header */}
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <h3>Run overview</h3>
            <span className={`badge ${statusBadge(run?.status)}`}>{run?.status}</span>
          </div>
          <div className="panel-body">
            <dl className="meta-grid">
              <div><dt>Trips</dt><dd>{run?.tripCount ?? trips.length}</dd></div>
              <div><dt>Completed</dt><dd>{run?.completedCount ?? 0}</dd></div>
              <div><dt>No-show</dt><dd>{run?.noShowCount ?? 0}</dd></div>
              <div><dt>Dispatched at</dt><dd>{run?.dispatchedAt ? new Date(run.dispatchedAt).toLocaleString() : '—'}</dd></div>
              <div><dt>Acknowledged at</dt><dd>{run?.acknowledgedAt ? new Date(run.acknowledgedAt).toLocaleString() : '—'}</dd></div>
              <div><dt>Started at</dt><dd>{run?.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</dd></div>
            </dl>
          </div>
          {!isTerminalRun && (
            <div className="panel-footer" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {trips.length > 1 && (
                <button type="button" className="btn btn-subtle" onClick={handleOptimize} disabled={saving}>
                  Optimize order
                </button>
              )}
              {!showAddTrip && (
                <button type="button" className="btn btn-subtle" onClick={() => setShowAddTrip(true)} disabled={saving}>
                  Add trip
                </button>
              )}
              {canDispatch && (
                <button type="button" className="btn btn-primary" onClick={handleDispatch} disabled={saving}>
                  Dispatch to driver
                </button>
              )}
            </div>
          )}
        </div>

        <div className="form-grid two-column">

          {/* Manifest */}
          <section className="panel">
            <div className="panel-header"><h3>Trip manifest</h3></div>
            <div className="panel-body" style={{ padding: 0 }}>
              {trips.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 24px' }}>No trips on this run yet.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Trip</th>
                      <th>Passenger</th>
                      <th>Pickup</th>
                      <th>Status</th>
                      {!isTerminalRun && <th>Order</th>}
                      {!isTerminalRun && <th>Remove</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t, idx) => {
                      const locked = TERMINAL_TRIP.has(t.status) || ['EnRoute','ArrivedPickup','PickedUp','ArrivedDrop'].includes(t.status);
                      return (
                        <tr key={t.id}>
                          <td data-label="#">{idx + 1}</td>
                          <td data-label="Trip">
                            <Link to={`/nemt/trips/${t.id}`}>#{t.tripId || t.id?.slice(-6)}</Link>
                          </td>
                          <td data-label="Passenger">
                            <div className="table-stack">
                              <span className="primary">{t.passengerName || '—'}</span>
                              <span className="secondary">{t.mobilityType || ''}</span>
                            </div>
                          </td>
                          <td data-label="Pickup">
                            <div className="table-stack">
                              <span className="primary">{t.pickupAddress || '—'}</span>
                              <span className="secondary">
                                {t.scheduledPickupTime
                                  ? new Date(t.scheduledPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : ''}
                              </span>
                            </div>
                          </td>
                          <td data-label="Status">
                            <span className={`badge ${tripStatusBadge(t.status)}`}>{t.status}</span>
                          </td>
                          {!isTerminalRun && (
                            <td data-label="Order">
                              {!locked && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '2px 8px' }}
                                    onClick={() => moveTrip(idx, -1)}
                                    disabled={saving || idx === 0}
                                    aria-label="Move up"
                                  >▲</button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '2px 8px' }}
                                    onClick={() => moveTrip(idx, 1)}
                                    disabled={saving || idx === trips.length - 1}
                                    aria-label="Move down"
                                  >▼</button>
                                </div>
                              )}
                            </td>
                          )}
                          {!isTerminalRun && (
                            <td data-label="Remove">
                              {!locked && (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{ padding: '2px 8px', color: 'var(--color-warning)' }}
                                  onClick={() => handleRemoveTrip(t.id)}
                                  disabled={saving}
                                >✕</button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Right column: meta + add-trip + controls */}
          <div>
            {/* Run meta edit */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <form onSubmit={handleSaveMeta}>
                <div className="panel-header"><h3>Driver assignment</h3></div>
                <div className="panel-body">
                  <div className="form-grid">
                    <div className="full-width">
                      <label htmlFor="driverId">Driver</label>
                      <select id="driverId" value={metaForm.driverId} onChange={setMeta('driverId')} disabled={isTerminalRun}>
                        <option value="">Unassigned</option>
                        {driverOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="cabNumber">Cab number</label>
                      <input id="cabNumber" type="text" value={metaForm.cabNumber} onChange={setMeta('cabNumber')} disabled={isTerminalRun} />
                    </div>
                    <div className="full-width">
                      <label htmlFor="notes">Notes</label>
                      <textarea id="notes" rows={2} value={metaForm.notes} onChange={setMeta('notes')} disabled={isTerminalRun} />
                    </div>
                  </div>
                </div>
                {!isTerminalRun && (
                  <div className="panel-footer">
                    <button type="submit" className="btn btn-primary" disabled={metaSaving}>Save</button>
                  </div>
                )}
              </form>
            </section>

            {/* Add trip panel */}
            {showAddTrip && !isTerminalRun && (
              <section className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                  <h3>Add trip to run</h3>
                  <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setShowAddTrip(false)}>✕</button>
                </div>
                <div className="panel-body">
                  <div className="search-input" style={{ marginBottom: 12 }}>
                    <span className="icon">🔍</span>
                    <input
                      type="search"
                      placeholder="Search trips by ID, passenger, address"
                      value={tripSearch}
                      onChange={(e) => setTripSearch(e.target.value)}
                    />
                  </div>
                  {unassignedLoading ? (
                    <div className="skeleton" style={{ height: 80 }} />
                  ) : filteredUnassigned.length === 0 ? (
                    <div className="empty-state">No unassigned Scheduled trips on this service date.</div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Trip</th><th>Passenger</th><th>Pickup time</th><th></th></tr></thead>
                      <tbody>
                        {filteredUnassigned.map((t) => (
                          <tr key={t.id}>
                            <td>#{t.tripId || t.id?.slice(-6)}</td>
                            <td>{t.passengerName || '—'}</td>
                            <td>
                              {t.scheduledPickupTime
                                ? new Date(t.scheduledPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="pill-button"
                                onClick={() => handleAddTrip(t.id)}
                                disabled={addingTrip === t.id}
                              >
                                {addingTrip === t.id ? '…' : 'Add'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {/* Cancel run */}
            {!isTerminalRun && (
              <section className="panel">
                <div className="panel-header"><h3>Cancel run</h3></div>
                <div className="panel-body">
                  <div className="form-grid">
                    <div className="full-width">
                      <label htmlFor="cancelReason">Reason</label>
                      <input id="cancelReason" type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <button type="button" className="btn btn-subtle" onClick={handleCancelRun} disabled={saving}>
                        Cancel entire run
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default NemtRunDetail;
