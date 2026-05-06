import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getTrip, updateTrip, cancelTrip, markTripNoShow } from '../../services/nemtService';

const MOBILITY_TYPES = [
  { value: 'ambulatory',    label: 'Ambulatory' },
  { value: 'wheelchair',    label: 'Wheelchair' },
  { value: 'wheelchair_xl', label: 'Wheelchair XL' },
  { value: 'stretcher',     label: 'Stretcher' },
  { value: 'other',         label: 'Other' },
];
const FARE_BASIS_OPTIONS = [
  { value: '',         label: 'Select…' },
  { value: 'per_trip', label: 'Per trip (flat)' },
  { value: 'per_mile', label: 'Per mile' },
  { value: 'flat',     label: 'Flat rate' },
];

const statusBadge = (status) => {
  if (status === 'Completed') return 'badge-success';
  if (['Cancelled', 'NoShow', 'PassengerCancelled'].includes(status)) return 'badge-warning';
  return 'badge-info';
};

const TERMINAL = new Set(['Completed', 'Cancelled', 'NoShow', 'PassengerCancelled']);

const NemtTripDetail = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [form, setForm] = useState({});
  const [cancelReason, setCancelReason] = useState('');
  const [noShowReason, setNoShowReason] = useState('');
  const [passengerCancelReason, setPassengerCancelReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getTrip(id)
      .then((res) => {
        const t = res.data?.trip || res.data;
        setTrip(t);
        setForm({
          passengerName: t.passengerName || '',
          passengerPhone: t.passengerPhone || '',
          mobilityType: t.mobilityType || 'Ambulatory',
          passengerCount: t.passengerCount ?? 1,
          attendantCount: t.attendantCount ?? 0,
          specialInstructions: t.specialInstructions || '',
          pickupAddress: t.pickupAddress || '',
          scheduledPickupTime: t.scheduledPickupTime ? t.scheduledPickupTime.substring(0, 16) : '',
          appointmentTime: t.appointmentTime ? t.appointmentTime.substring(0, 16) : '',
          dropoffAddress: t.dropoffAddress || '',
          estimatedMiles: t.estimatedMiles ?? '',
          agencyFare: t.agencyFare ?? '',
          agencyFareBasis: t.agencyFareBasis || '',
          driverPay: t.driverPay ?? '',
          driverPayBasis: t.driverPayBasis || '',
          internalNotes: t.internalNotes || '',
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load trip.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        passengerCount: Number(form.passengerCount) || 1,
        attendantCount: Number(form.attendantCount) || 0,
        agencyFare: form.agencyFare !== '' ? Number(form.agencyFare) : undefined,
        estimatedMiles: form.estimatedMiles !== '' ? Number(form.estimatedMiles) : undefined,
        driverPay: form.driverPay !== '' ? Number(form.driverPay) : undefined,
      };
      const res = await updateTrip(id, payload);
      setTrip((prev) => ({ ...prev, ...(res.data?.trip || {}) }));
      setMessage('Trip updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this trip?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await cancelTrip(id, { cancelledBy: 'dispatch', cancelReason: cancelReason || undefined });
      setTrip((prev) => ({ ...prev, ...(res.data?.trip || { status: 'Cancelled' }) }));
      setMessage('Trip cancelled.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel trip.');
    } finally {
      setSaving(false);
    }
  };

  const handlePassengerCancel = async () => {
    if (!window.confirm('Mark this trip as passenger-cancelled?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await cancelTrip(id, { cancelledBy: 'passenger', cancelReason: passengerCancelReason || undefined });
      setTrip((prev) => ({ ...prev, ...(res.data?.trip || { status: 'PassengerCancelled' }) }));
      setMessage('Trip marked passenger-cancelled.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark passenger-cancelled.');
    } finally {
      setSaving(false);
    }
  };

  const handleNoShow = async () => {
    if (!window.confirm('Mark this trip as no-show?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await markTripNoShow(id, { reason: noShowReason || undefined });
      setTrip((prev) => ({ ...prev, ...(res.data?.trip || { status: 'NoShow' }) }));
      setMessage('Trip marked no-show.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark no-show.');
    } finally {
      setSaving(false);
    }
  };

  const isTerminal = trip ? TERMINAL.has(trip.status) : false;

  const actions = <Link to="/nemt/trips" className="btn btn-ghost">Back to trips</Link>;

  if (loading) {
    return (
      <AppLayout title="NEMT Trip" actions={actions}>
        <div className="surface"><div className="skeleton" style={{ height: 400 }} /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Trip #${trip?.tripId || id?.slice(-6) || ''}`}
      subtitle={trip?.passengerName || 'NEMT trip detail'}
      actions={actions}
    >
      <div className="surface">
        {message && <div className="feedback success">{message}</div>}
        {error && <div className="feedback error">{error}</div>}

        {/* Overview */}
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <h3>Overview</h3>
            <span className={`badge ${statusBadge(trip?.status)}`}>{trip?.status}</span>
          </div>
          <div className="panel-body">
            <dl className="meta-grid">
              <div><dt>Agency ref</dt><dd>{trip?.agencyTripRef || '—'}</dd></div>
              <div><dt>Service date</dt><dd>{trip?.serviceDate ? new Date(trip.serviceDate).toLocaleDateString() : '—'}</dd></div>
              <div><dt>Driver</dt><dd>{trip?.driverId || 'Unassigned'}</dd></div>
              <div><dt>Run</dt><dd>{trip?.runId ? <Link to={`/nemt/runs/${trip.runId}`}>View run</Link> : '—'}</dd></div>
              <div><dt>Run sequence</dt><dd>{trip?.runSequence ?? '—'}</dd></div>
              <div><dt>OTP status</dt><dd>{trip?.otpStatus || '—'}</dd></div>
              <div><dt>Billing status</dt><dd>{trip?.billingStatus || '—'}</dd></div>
              <div><dt>Pay status</dt><dd>{trip?.payStatus || '—'}</dd></div>
            </dl>
          </div>
        </div>

        <div className="form-grid two-column">
          {/* Edit form */}
          <section className="panel">
            <form onSubmit={handleSave}>
              <div className="panel-header"><h3>Trip details</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="passengerName">Passenger</label>
                    <input id="passengerName" type="text" value={form.passengerName} onChange={set('passengerName')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="passengerPhone">Phone</label>
                    <input id="passengerPhone" type="tel" value={form.passengerPhone} onChange={set('passengerPhone')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="mobilityType">Mobility</label>
                    <select id="mobilityType" value={form.mobilityType} onChange={set('mobilityType')} disabled={isTerminal}>
                      {MOBILITY_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="passengerCount">Passengers</label>
                    <input id="passengerCount" type="number" min="1" value={form.passengerCount} onChange={set('passengerCount')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="attendantCount">Attendants</label>
                    <input id="attendantCount" type="number" min="0" value={form.attendantCount} onChange={set('attendantCount')} disabled={isTerminal} />
                  </div>
                  <div className="full-width">
                    <label htmlFor="pickupAddress">Pickup address</label>
                    <input id="pickupAddress" type="text" value={form.pickupAddress} onChange={set('pickupAddress')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="scheduledPickupTime">Pickup time</label>
                    <input id="scheduledPickupTime" type="datetime-local" value={form.scheduledPickupTime} onChange={set('scheduledPickupTime')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="appointmentTime">Appointment time</label>
                    <input id="appointmentTime" type="datetime-local" value={form.appointmentTime} onChange={set('appointmentTime')} disabled={isTerminal} />
                  </div>
                  <div className="full-width">
                    <label htmlFor="dropoffAddress">Dropoff address</label>
                    <input id="dropoffAddress" type="text" value={form.dropoffAddress} onChange={set('dropoffAddress')} disabled={isTerminal} />
                  </div>
                  <div className="full-width">
                    <label htmlFor="specialInstructions">Special instructions</label>
                    <textarea id="specialInstructions" rows={2} value={form.specialInstructions} onChange={set('specialInstructions')} disabled={isTerminal} />
                  </div>
                </div>
              </div>
              {!isTerminal && (
                <div className="panel-footer">
                  <button type="submit" className="btn btn-primary" disabled={saving}>Save changes</button>
                </div>
              )}
            </form>
          </section>

          {/* Financials + actions */}
          <div>
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Financials</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="estimatedMiles">Est. miles</label>
                    <input id="estimatedMiles" type="number" step="0.1" value={form.estimatedMiles} onChange={set('estimatedMiles')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="agencyFare">Agency fare ($)</label>
                    <input id="agencyFare" type="number" step="0.01" value={form.agencyFare} onChange={set('agencyFare')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="agencyFareBasis">Fare basis</label>
                    <select id="agencyFareBasis" value={form.agencyFareBasis} onChange={set('agencyFareBasis')} disabled={isTerminal}>
                      {FARE_BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="driverPay">Driver pay ($)</label>
                    <input id="driverPay" type="number" step="0.01" value={form.driverPay} onChange={set('driverPay')} disabled={isTerminal} />
                  </div>
                  <div>
                    <label htmlFor="driverPayBasis">Pay basis</label>
                    <select id="driverPayBasis" value={form.driverPayBasis} onChange={set('driverPayBasis')} disabled={isTerminal}>
                      {FARE_BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="full-width">
                    <label htmlFor="internalNotes">Internal notes</label>
                    <textarea id="internalNotes" rows={2} value={form.internalNotes} onChange={set('internalNotes')} />
                  </div>
                </div>
              </div>
            </section>

            {!isTerminal && (
              <section className="panel">
                <div className="panel-header"><h3>Actions</h3></div>
                <div className="panel-body">
                  <div className="form-grid">
                    <div className="full-width">
                      <label htmlFor="cancelReason">Cancel reason</label>
                      <input id="cancelReason" type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <button type="button" className="btn btn-subtle" onClick={handleCancel} disabled={saving}>
                        Cancel trip
                      </button>
                    </div>
                    <div className="full-width" style={{ marginTop: 8, borderTop: '1px solid var(--surface-border)', paddingTop: 16 }}>
                      <label htmlFor="noShowReason">No-show reason</label>
                      <input id="noShowReason" type="text" value={noShowReason} onChange={(e) => setNoShowReason(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <button type="button" className="btn btn-subtle" onClick={handleNoShow} disabled={saving}>
                        Mark no-show
                      </button>
                    </div>
                    <div className="full-width" style={{ marginTop: 8, borderTop: '1px solid var(--surface-border)', paddingTop: 16 }}>
                      <label htmlFor="passengerCancelReason">Passenger cancel reason</label>
                      <input id="passengerCancelReason" type="text" value={passengerCancelReason} onChange={(e) => setPassengerCancelReason(e.target.value)} placeholder="Optional — passenger called to cancel" />
                    </div>
                    <div>
                      <button type="button" className="btn btn-subtle" onClick={handlePassengerCancel} disabled={saving}>
                        Passenger cancelled
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

export default NemtTripDetail;
