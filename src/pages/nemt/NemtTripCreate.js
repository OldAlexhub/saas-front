import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listAgencies, createTrip, getNemtSettings } from '../../services/nemtService';

const MOBILITY_TYPES = ['Ambulatory', 'Wheelchair', 'Stretcher', 'GurneyVan'];
const TRIP_DIRECTIONS = ['OneWay', 'RoundTrip'];

const empty = () => ({
  agencyId: '',
  agencyTripRef: '',
  serviceDate: '',
  passengerName: '',
  passengerPhone: '',
  mobilityType: 'Ambulatory',
  passengerCount: 1,
  attendantCount: 0,
  specialInstructions: '',
  pickupAddress: '',
  scheduledPickupTime: '',
  pickupWindowEarliest: '',
  pickupWindowLatest: '',
  dropoffAddress: '',
  appointmentTime: '',
  tripDirection: 'OneWay',
  agencyFare: '',
  agencyFareBasis: '',
  estimatedMiles: '',
  driverPay: '',
  driverPayBasis: '',
  internalNotes: '',
});

const NemtTripCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty());
  const [agencies, setAgencies] = useState([]);
  const [paySettings, setPaySettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listAgencies().then((res) => setAgencies(res.data?.agencies || [])).catch(() => {});
    getNemtSettings()
      .then((res) => {
        const s = res.data?.settings || res.data || {};
        setPaySettings({
          basis: s.defaultPayBasis || 'percentage',
          percentage: s.defaultPayPercentage ?? 0,
          perTrip: s.defaultPayRatePerTrip ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === 'number' ? e.target.value : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      // Strip empty strings for optional fields
      ['agencyTripRef', 'passengerPhone', 'specialInstructions',
       'pickupWindowEarliest', 'pickupWindowLatest', 'appointmentTime',
       'agencyFareBasis', 'driverPayBasis', 'internalNotes'].forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      const res = await createTrip(payload);
      const created = res.data?.trip;
      navigate(`/nemt/trips/${created?._id || ''}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <a href="/nemt/trips" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); navigate('/nemt/trips'); }}>
      Back to trips
    </a>
  );

  return (
    <AppLayout
      title="New NEMT Trip"
      subtitle="Enter trip details for a single pre-scheduled medical transport."
      actions={actions}
    >
      <div className="surface">
        {error && <div className="feedback error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid two-column">

            {/* Left column */}
            <section className="panel">
              <div className="panel-header"><h3>Passenger & scheduling</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="agencyId">Agency</label>
                    <select id="agencyId" value={form.agencyId} onChange={set('agencyId')} required>
                      <option value="">Select agency…</option>
                      {agencies.map((a) => (
                        <option key={a._id} value={a.agencyId}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="agencyTripRef">Agency trip ref</label>
                    <input id="agencyTripRef" type="text" value={form.agencyTripRef} onChange={set('agencyTripRef')} placeholder="Optional" />
                  </div>
                  <div>
                    <label htmlFor="serviceDate">Service date</label>
                    <input id="serviceDate" type="date" value={form.serviceDate} onChange={set('serviceDate')} required />
                  </div>
                  <div>
                    <label htmlFor="tripDirection">Direction</label>
                    <select id="tripDirection" value={form.tripDirection} onChange={set('tripDirection')}>
                      {TRIP_DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="passengerName">Passenger name</label>
                    <input id="passengerName" type="text" value={form.passengerName} onChange={set('passengerName')} required />
                  </div>
                  <div>
                    <label htmlFor="passengerPhone">Passenger phone</label>
                    <input id="passengerPhone" type="tel" value={form.passengerPhone} onChange={set('passengerPhone')} />
                  </div>
                  <div>
                    <label htmlFor="mobilityType">Mobility type</label>
                    <select id="mobilityType" value={form.mobilityType} onChange={set('mobilityType')}>
                      {MOBILITY_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="passengerCount">Passengers</label>
                    <input id="passengerCount" type="number" min="1" value={form.passengerCount} onChange={set('passengerCount')} />
                  </div>
                  <div>
                    <label htmlFor="attendantCount">Attendants</label>
                    <input id="attendantCount" type="number" min="0" value={form.attendantCount} onChange={set('attendantCount')} />
                  </div>
                  <div className="full-width">
                    <label htmlFor="specialInstructions">Special instructions</label>
                    <textarea id="specialInstructions" rows={2} value={form.specialInstructions} onChange={set('specialInstructions')} />
                  </div>
                </div>
              </div>
            </section>

            {/* Right column */}
            <section className="panel">
              <div className="panel-header"><h3>Trip routing & financials</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div className="full-width">
                    <label htmlFor="pickupAddress">Pickup address</label>
                    <input id="pickupAddress" type="text" value={form.pickupAddress} onChange={set('pickupAddress')} required />
                  </div>
                  <div>
                    <label htmlFor="scheduledPickupTime">Scheduled pickup time</label>
                    <input id="scheduledPickupTime" type="datetime-local" value={form.scheduledPickupTime} onChange={set('scheduledPickupTime')} required />
                  </div>
                  <div>
                    <label htmlFor="appointmentTime">Appointment time</label>
                    <input id="appointmentTime" type="datetime-local" value={form.appointmentTime} onChange={set('appointmentTime')} />
                  </div>
                  <div>
                    <label htmlFor="pickupWindowEarliest">Pickup window — earliest</label>
                    <input id="pickupWindowEarliest" type="datetime-local" value={form.pickupWindowEarliest} onChange={set('pickupWindowEarliest')} />
                  </div>
                  <div>
                    <label htmlFor="pickupWindowLatest">Pickup window — latest</label>
                    <input id="pickupWindowLatest" type="datetime-local" value={form.pickupWindowLatest} onChange={set('pickupWindowLatest')} />
                  </div>
                  <div className="full-width">
                    <label htmlFor="dropoffAddress">Dropoff address</label>
                    <input id="dropoffAddress" type="text" value={form.dropoffAddress} onChange={set('dropoffAddress')} required />
                  </div>
                  <div>
                    <label htmlFor="estimatedMiles">Estimated miles</label>
                    <input id="estimatedMiles" type="number" step="0.1" min="0" value={form.estimatedMiles} onChange={set('estimatedMiles')} />
                  </div>
                  <div>
                    <label htmlFor="agencyFare">Agency fare ($)</label>
                    <input id="agencyFare" type="number" step="0.01" min="0" value={form.agencyFare} onChange={set('agencyFare')} />
                  </div>
                  <div>
                    <label htmlFor="agencyFareBasis">Fare basis</label>
                    <input id="agencyFareBasis" type="text" value={form.agencyFareBasis} onChange={set('agencyFareBasis')} placeholder="e.g. mileage, flat" />
                  </div>
                  <div>
                    <label htmlFor="driverPay">
                      Driver pay ($)
                      {form.driverPay === '' && paySettings && form.agencyFare !== '' && (() => {
                        const fare = Number(form.agencyFare);
                        if (!fare) return null;
                        let preview = null;
                        if (paySettings.basis === 'percentage' && paySettings.percentage > 0) {
                          const amt = (fare * (100 - paySettings.percentage) / 100).toFixed(2);
                          preview = `Auto: $${amt} (${100 - paySettings.percentage}% of fare)`;
                        } else if (paySettings.basis === 'per_trip' && paySettings.perTrip > 0) {
                          preview = `Auto: $${paySettings.perTrip.toFixed(2)} (flat rate)`;
                        }
                        return preview ? (
                          <span style={{ marginLeft: 8, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                            {preview}
                          </span>
                        ) : null;
                      })()}
                    </label>
                    <input
                      id="driverPay"
                      type="number" step="0.01" min="0"
                      value={form.driverPay}
                      onChange={set('driverPay')}
                      placeholder="Leave blank to auto-calculate"
                    />
                  </div>
                  <div className="full-width">
                    <label htmlFor="internalNotes">Internal notes</label>
                    <textarea id="internalNotes" rows={2} value={form.internalNotes} onChange={set('internalNotes')} />
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create trip'}
                </button>
              </div>
            </section>

          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NemtTripCreate;
