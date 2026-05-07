import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import {
  listBillingBatches, getBillingBatch, createBillingBatch, updateBillingBatch, getUnbilledTrips,
  listPayBatches, getPayBatch, createPayBatch, updatePayBatch, getUnpaidTrips,
  listAgencies,
} from '../../services/nemtService';

const statusBadge = (status) => {
  if (status === 'paid') return 'badge-success';
  if (['cancelled', 'disputed'].includes(status)) return 'badge-warning';
  return 'badge-info';
};

const fmt = (n) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');

// --- Agency Billing Tab ---
const BillingTab = () => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ agencyId: '', notes: '' });
  const [unbilledAgencyId, setUnbilledAgencyId] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updateForm, setUpdateForm] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: agencies = [] } = useQuery({
    queryKey: ['nemt-agencies'],
    queryFn: async () => (await listAgencies()).data?.agencies || [],
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['nemt-billing-batches'],
    queryFn: async () => (await listBillingBatches()).data?.batches || [],
  });

  const { data: unbilled = [], isLoading: unbilledLoading } = useQuery({
    queryKey: ['nemt-unbilled', unbilledAgencyId],
    queryFn: async () => {
      const params = unbilledAgencyId ? { agencyId: unbilledAgencyId } : {};
      return (await getUnbilledTrips(params)).data?.trips || [];
    },
    enabled: showCreate,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.agencyId) { setError('Select an agency.'); return; }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await createBillingBatch({ agencyId: createForm.agencyId, notes: createForm.notes || undefined });
      setShowCreate(false);
      setCreateForm({ agencyId: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['nemt-billing-batches'] });
      setMessage('Billing batch created.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create batch.');
    } finally {
      setSaving(false);
    }
  };

  const expandBatch = async (b) => {
    if (expandedId === b._id) { setExpandedId(null); setExpandedData(null); return; }
    setExpandedId(b._id);
    setExpandedData(null);
    setUpdateForm({ status: b.status, referenceNumber: b.referenceNumber || '', notes: b.notes || '' });
    try {
      const res = await getBillingBatch(b._id);
      setExpandedData(res.data?.batch || {});
    } catch { setExpandedData({}); }
  };

  const handleUpdate = async (batchId) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateBillingBatch(batchId, updateForm);
      qc.invalidateQueries({ queryKey: ['nemt-billing-batches'] });
      setExpandedId(null);
      setMessage('Batch updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update batch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {message && <div className="feedback success">{message}</div>}
      {error && <div className="feedback error">{error}</div>}

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="summary">{batches.length} billing batch{batches.length !== 1 ? 'es' : ''}</div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '＋ New billing batch'}
        </button>
      </div>

      {showCreate && (
        <section className="panel" style={{ marginBottom: 24, maxWidth: 560 }}>
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h3>New billing batch</h3></div>
            <div className="panel-body">
              <div className="form-grid">
                <div>
                  <label htmlFor="bill-agency">Agency</label>
                  <select
                    id="bill-agency"
                    value={createForm.agencyId}
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, agencyId: e.target.value }));
                      setUnbilledAgencyId(e.target.value);
                    }}
                    required
                  >
                    <option value="">Select agency…</option>
                    {agencies.map((a) => <option key={a._id} value={a.agencyId}>{a.name}</option>)}
                  </select>
                </div>
                <div className="full-width">
                  <label htmlFor="bill-notes">Notes</label>
                  <textarea id="bill-notes" rows={2} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              {createForm.agencyId && (
                <div style={{ marginTop: 12 }}>
                  {unbilledLoading ? <div className="skeleton" style={{ height: 60 }} /> : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {unbilled.length} unbilled completed trip{unbilled.length !== 1 ? 's' : ''} for this agency
                      {unbilled.length > 0 && ` · ${fmt(unbilled.reduce((s, t) => s + (t.agencyFare || 0), 0))} total`}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="panel-footer">
              <button type="submit" className="btn btn-primary" disabled={saving || !createForm.agencyId}>
                Create batch
              </button>
            </div>
          </form>
        </section>
      )}

      {isLoading ? <div className="skeleton" style={{ height: 200 }} /> : batches.length === 0 ? (
        <div className="empty-state">No billing batches yet.</div>
      ) : (
        <div className="table-responsive-stack">
          <table className="data-table">
            <thead>
              <tr><th>Batch</th><th>Agency</th><th>Trips</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <>
                  <tr key={b._id}>
                    <td data-label="Batch">
                      <div className="table-stack">
                        <span className="primary">{b._id?.slice(-8)}</span>
                        <span className="secondary">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </td>
                    <td data-label="Agency">{b.agencyName || b.agencyId}</td>
                    <td data-label="Trips">{b.tripCount ?? '—'}</td>
                    <td data-label="Total">{fmt(b.totalAmount)}</td>
                    <td data-label="Status"><span className={`badge ${statusBadge(b.status)}`}>{b.status}</span></td>
                    <td>
                      <button type="button" className="pill-button" onClick={() => expandBatch(b)}>
                        {expandedId === b._id ? 'Close' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === b._id && (
                    <tr key={`${b._id}-expand`}>
                      <td colSpan={6} style={{ background: 'var(--surface-highlight)', padding: '16px 24px' }}>
                        <div className="form-grid" style={{ maxWidth: 480 }}>
                          <div>
                            <label htmlFor={`bs-${b._id}`}>Status</label>
                            <select id={`bs-${b._id}`} value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}>
                              {['draft','sent','paid','disputed','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`br-${b._id}`}>Reference number</label>
                            <input id={`br-${b._id}`} type="text" value={updateForm.referenceNumber} onChange={(e) => setUpdateForm((p) => ({ ...p, referenceNumber: e.target.value }))} />
                          </div>
                          <div className="full-width">
                            <label htmlFor={`bn-${b._id}`}>Notes</label>
                            <textarea id={`bn-${b._id}`} rows={2} value={updateForm.notes} onChange={(e) => setUpdateForm((p) => ({ ...p, notes: e.target.value }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-primary" onClick={() => handleUpdate(b._id)} disabled={saving}>Save</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setExpandedId(null)}>Cancel</button>
                          </div>
                        </div>
                        {expandedData?.trips?.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <table className="data-table">
                              <thead><tr><th>Trip</th><th>Passenger</th><th>Date</th><th>Agency fare</th></tr></thead>
                              <tbody>
                                {expandedData.trips.map((t) => (
                                  <tr key={t._id}>
                                    <td>#{t.tripId}</td>
                                    <td>{t.passengerName}</td>
                                    <td>{t.serviceDate ? new Date(t.serviceDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}</td>
                                    <td>{fmt(t.agencyFare)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Driver Pay Tab ---
const PayTab = () => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ driverId: '', notes: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updateForm, setUpdateForm] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [payoutModal, setPayoutModal] = useState(null); // { batchId, driverName, totalAmount }
  const [payoutForm, setPayoutForm] = useState({ paymentMethod: 'check', referenceNumber: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' });

  const { data: unpaid = [], isLoading: unpaidLoading } = useQuery({
    queryKey: ['nemt-unpaid', createForm.driverId],
    queryFn: async () => {
      const params = createForm.driverId ? { driverId: createForm.driverId } : {};
      return (await getUnpaidTrips(params)).data?.trips || [];
    },
    enabled: showCreate,
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['nemt-pay-batches'],
    queryFn: async () => (await listPayBatches()).data?.batches || [],
  });

  const driverIds = [...new Set(unpaid.map((t) => t.driverId).filter(Boolean))];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.driverId) { setError('Enter a driver ID.'); return; }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await createPayBatch({ driverId: createForm.driverId, notes: createForm.notes || undefined });
      setShowCreate(false);
      setCreateForm({ driverId: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['nemt-pay-batches'] });
      setMessage('Pay batch created.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create pay batch.');
    } finally {
      setSaving(false);
    }
  };

  const expandBatch = async (b) => {
    if (expandedId === b._id) { setExpandedId(null); setExpandedData(null); return; }
    setExpandedId(b._id);
    setExpandedData(null);
    setUpdateForm({ status: b.status, referenceNumber: b.referenceNumber || '', notes: b.notes || '' });
    try {
      const res = await getPayBatch(b._id);
      setExpandedData(res.data?.batch || {});
    } catch { setExpandedData({}); }
  };

  const handleUpdate = async (batchId) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updatePayBatch(batchId, updateForm);
      qc.invalidateQueries({ queryKey: ['nemt-pay-batches'] });
      setExpandedId(null);
      setMessage('Pay batch updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update batch.');
    } finally {
      setSaving(false);
    }
  };

  const openPayoutModal = (b) => {
    setPayoutModal({ batchId: b._id, driverName: b.driverName || b.driverId, totalAmount: b.totalAmount });
    setPayoutForm({ paymentMethod: 'check', referenceNumber: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' });
  };

  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (!payoutModal) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updatePayBatch(payoutModal.batchId, {
        status: 'paid',
        paidAt: payoutForm.paidAt,
        paymentMethod: payoutForm.paymentMethod,
        referenceNumber: payoutForm.referenceNumber || undefined,
        notes: payoutForm.notes || undefined,
      });
      qc.invalidateQueries({ queryKey: ['nemt-pay-batches'] });
      setPayoutModal(null);
      setExpandedId(null);
      setMessage(`Payout recorded for ${payoutModal.driverName}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payout.');
    } finally {
      setSaving(false);
    }
  };

  const totalUnpaid = unpaid
    .filter((t) => !createForm.driverId || t.driverId === createForm.driverId)
    .reduce((s, t) => s + (t.driverPay || 0), 0);

  return (
    <div>
      {message && <div className="feedback success">{message}</div>}
      {error && <div className="feedback error">{error}</div>}

      {/* Payout confirmation modal */}
      {payoutModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="panel" style={{ maxWidth: 460, width: '100%', margin: '0 16px' }}>
            <div className="panel-header">
              <h3>Record payout — {payoutModal.driverName}</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Amount: <strong>{fmt(payoutModal.totalAmount)}</strong></p>
            </div>
            <form onSubmit={handleConfirmPayout}>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="po-method">Payment method</label>
                    <select id="po-method" value={payoutForm.paymentMethod} onChange={(e) => setPayoutForm((p) => ({ ...p, paymentMethod: e.target.value }))} required>
                      <option value="check">Check</option>
                      <option value="ach">ACH / Direct deposit</option>
                      <option value="cash">Cash</option>
                      <option value="zelle">Zelle</option>
                      <option value="venmo">Venmo</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="po-date">Payment date</label>
                    <input id="po-date" type="date" value={payoutForm.paidAt} onChange={(e) => setPayoutForm((p) => ({ ...p, paidAt: e.target.value }))} required />
                  </div>
                  <div className="full-width">
                    <label htmlFor="po-ref">Reference / Check # <span style={{ color: 'var(--text-secondary)' }}>(optional)</span></label>
                    <input id="po-ref" type="text" value={payoutForm.referenceNumber} onChange={(e) => setPayoutForm((p) => ({ ...p, referenceNumber: e.target.value }))} placeholder="e.g. 1042 or ACH-20250506" />
                  </div>
                  <div className="full-width">
                    <label htmlFor="po-notes">Notes <span style={{ color: 'var(--text-secondary)' }}>(optional)</span></label>
                    <textarea id="po-notes" rows={2} value={payoutForm.notes} onChange={(e) => setPayoutForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="panel-footer" style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : `Confirm payout — ${fmt(payoutModal.totalAmount)}`}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPayoutModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="summary">{batches.length} pay batch{batches.length !== 1 ? 'es' : ''}</div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '＋ New pay batch'}
        </button>
      </div>

      {showCreate && (
        <section className="panel" style={{ marginBottom: 24, maxWidth: 560 }}>
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h3>New driver pay batch</h3></div>
            <div className="panel-body">
              <div className="form-grid">
                <div>
                  <label htmlFor="pay-driver">Driver ID</label>
                  <input
                    id="pay-driver"
                    type="text"
                    list="pay-driver-list"
                    value={createForm.driverId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, driverId: e.target.value }))}
                    placeholder="Enter driver ID"
                    required
                  />
                  <datalist id="pay-driver-list">
                    {driverIds.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div className="full-width">
                  <label htmlFor="pay-notes">Notes</label>
                  <textarea id="pay-notes" rows={2} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              {createForm.driverId && (
                <p style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {unpaidLoading ? 'Loading…' : `${unpaid.filter((t) => t.driverId === createForm.driverId).length} unpaid trips · ${fmt(totalUnpaid)} total`}
                </p>
              )}
            </div>
            <div className="panel-footer">
              <button type="submit" className="btn btn-primary" disabled={saving}>Create batch</button>
            </div>
          </form>
        </section>
      )}

      {isLoading ? <div className="skeleton" style={{ height: 200 }} /> : batches.length === 0 ? (
        <div className="empty-state">No pay batches yet.</div>
      ) : (
        <div className="table-responsive-stack">
          <table className="data-table">
            <thead>
              <tr><th>Batch</th><th>Driver</th><th>Trips</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <>
                  <tr key={b._id}>
                    <td data-label="Batch">
                      <div className="table-stack">
                        <span className="primary">{b._id?.slice(-8)}</span>
                        <span className="secondary">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </td>
                    <td data-label="Driver">{b.driverName || b.driverId}</td>
                    <td data-label="Trips">{b.tripCount ?? '—'}</td>
                    <td data-label="Total">{fmt(b.totalAmount)}</td>
                    <td data-label="Status"><span className={`badge ${statusBadge(b.status)}`}>{b.status}</span></td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['draft', 'sent'].includes(b.status) && (
                        <button type="button" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => openPayoutModal(b)}>
                          Record payout
                        </button>
                      )}
                      <button type="button" className="pill-button" onClick={() => expandBatch(b)}>
                        {expandedId === b._id ? 'Close' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === b._id && (
                    <tr key={`${b._id}-expand`}>
                      <td colSpan={6} style={{ background: 'var(--surface-highlight)', padding: '16px 24px' }}>
                        <div className="form-grid" style={{ maxWidth: 480 }}>
                          {b.paymentMethod && (
                            <div className="full-width" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Paid via <strong>{b.paymentMethod}</strong>
                              {b.referenceNumber ? ` · Ref: ${b.referenceNumber}` : ''}
                              {b.paidAt ? ` · ${new Date(b.paidAt).toLocaleDateString()}` : ''}
                            </div>
                          )}
                          <div>
                            <label htmlFor={`ps-${b._id}`}>Status</label>
                            <select id={`ps-${b._id}`} value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}>
                              {['draft','sent','paid','disputed','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`pr-${b._id}`}>Reference number</label>
                            <input id={`pr-${b._id}`} type="text" value={updateForm.referenceNumber} onChange={(e) => setUpdateForm((p) => ({ ...p, referenceNumber: e.target.value }))} />
                          </div>
                          <div className="full-width">
                            <label htmlFor={`pn-${b._id}`}>Notes</label>
                            <textarea id={`pn-${b._id}`} rows={2} value={updateForm.notes} onChange={(e) => setUpdateForm((p) => ({ ...p, notes: e.target.value }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-primary" onClick={() => handleUpdate(b._id)} disabled={saving}>Save</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setExpandedId(null)}>Cancel</button>
                          </div>
                        </div>
                        {expandedData?.trips?.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <table className="data-table">
                              <thead><tr><th>Trip</th><th>Passenger</th><th>Date</th><th>Pay</th><th>Status</th></tr></thead>
                              <tbody>
                                {expandedData.trips.map((t) => (
                                  <tr key={t._id}>
                                    <td>#{t.tripId}</td>
                                    <td>{t.passengerName}</td>
                                    <td>{t.serviceDate ? new Date(t.serviceDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}</td>
                                    <td>{fmt(t.driverPay)}</td>
                                    <td><span className={`badge ${statusBadge(t.payStatus)}`}>{t.payStatus}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Main NemtPay component ---
const NemtPay = () => {
  const [tab, setTab] = useState('billing');

  return (
    <AppLayout title="NEMT Pay & Billing" subtitle="Manage agency billing batches and driver pay batches.">
      <div className="surface">
        <div className="toolbar" style={{ marginBottom: 24 }}>
          <button
            type="button"
            className={`btn ${tab === 'billing' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('billing')}
          >
            Agency billing
          </button>
          <button
            type="button"
            className={`btn ${tab === 'pay' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('pay')}
          >
            Driver pay
          </button>
        </div>

        {tab === 'billing' ? <BillingTab /> : <PayTab />}
      </div>
    </AppLayout>
  );
};

export default NemtPay;
