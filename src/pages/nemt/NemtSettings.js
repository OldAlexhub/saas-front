import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { getNemtSettings, updateNemtSettings } from '../../services/nemtService';

const DEFAULT_FORM = {
  otpOnTimeMaxMinutes: 15,
  otpLateMaxMinutes: 30,
  defaultPickupWindowMinutesBefore: 15,
  defaultPickupWindowMinutesAfter: 15,
  appointmentBufferMinutes: 15,
  maxDeviationMiles: 5,
  clusterWindowMinutes: 30,
  requireDriverAcknowledgement: true,
  manifestCutoffMinutes: 60,
  allowReoptimizeAfterDispatch: true,
  defaultPayBasis: 'percentage',
  defaultPayRatePerTrip: 0,
  defaultPayRatePerMile: 0,
  defaultPayPercentage: 0,
  showDriverFinance: true,
  onlineDriversOnly: true,
  blockDispatchToOfflineDrivers: false,
  requireCabBeforeDispatch: false,
  avgMphForOptimization: 25,
  defaultMaxTripsPerRun: 12,
  serviceTimeAmbulatory: 3,
  serviceTimeWheelchair: 8,
  serviceTimeWheelchairXl: 10,
  serviceTimeStretcher: 12,
};

const NemtSettings = () => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getNemtSettings()
      .then((res) => {
        const s = res.data?.settings || res.data || {};
        const stm = s.serviceTimeByMobility || {};
        setForm({
          otpOnTimeMaxMinutes:               s.otpOnTimeMaxMinutes               ?? DEFAULT_FORM.otpOnTimeMaxMinutes,
          otpLateMaxMinutes:                 s.otpLateMaxMinutes                 ?? DEFAULT_FORM.otpLateMaxMinutes,
          defaultPickupWindowMinutesBefore:  s.defaultPickupWindowMinutesBefore  ?? DEFAULT_FORM.defaultPickupWindowMinutesBefore,
          defaultPickupWindowMinutesAfter:   s.defaultPickupWindowMinutesAfter   ?? DEFAULT_FORM.defaultPickupWindowMinutesAfter,
          appointmentBufferMinutes:          s.appointmentBufferMinutes          ?? DEFAULT_FORM.appointmentBufferMinutes,
          maxDeviationMiles:                 s.maxDeviationMiles                 ?? DEFAULT_FORM.maxDeviationMiles,
          clusterWindowMinutes:              s.clusterWindowMinutes              ?? DEFAULT_FORM.clusterWindowMinutes,
          requireDriverAcknowledgement:      s.requireDriverAcknowledgement      ?? DEFAULT_FORM.requireDriverAcknowledgement,
          manifestCutoffMinutes:             s.manifestCutoffMinutes             ?? DEFAULT_FORM.manifestCutoffMinutes,
          allowReoptimizeAfterDispatch:      s.allowReoptimizeAfterDispatch      ?? DEFAULT_FORM.allowReoptimizeAfterDispatch,
          defaultPayBasis:                   s.defaultPayBasis                   ?? DEFAULT_FORM.defaultPayBasis,
          defaultPayRatePerTrip:             s.defaultPayRatePerTrip             ?? DEFAULT_FORM.defaultPayRatePerTrip,
          defaultPayRatePerMile:             s.defaultPayRatePerMile             ?? DEFAULT_FORM.defaultPayRatePerMile,
          defaultPayPercentage:              s.defaultPayPercentage              ?? DEFAULT_FORM.defaultPayPercentage,
          showDriverFinance:                 s.showDriverFinance                 ?? DEFAULT_FORM.showDriverFinance,
          onlineDriversOnly:                 s.onlineDriversOnly                 ?? DEFAULT_FORM.onlineDriversOnly,
          blockDispatchToOfflineDrivers:     s.blockDispatchToOfflineDrivers     ?? DEFAULT_FORM.blockDispatchToOfflineDrivers,
          requireCabBeforeDispatch:          s.requireCabBeforeDispatch          ?? DEFAULT_FORM.requireCabBeforeDispatch,
          avgMphForOptimization:             s.avgMphForOptimization             ?? DEFAULT_FORM.avgMphForOptimization,
          defaultMaxTripsPerRun:             s.defaultMaxTripsPerRun             ?? DEFAULT_FORM.defaultMaxTripsPerRun,
          serviceTimeAmbulatory:             stm.ambulatory                      ?? DEFAULT_FORM.serviceTimeAmbulatory,
          serviceTimeWheelchair:             stm.wheelchair                      ?? DEFAULT_FORM.serviceTimeWheelchair,
          serviceTimeWheelchairXl:           stm.wheelchair_xl                   ?? DEFAULT_FORM.serviceTimeWheelchairXl,
          serviceTimeStretcher:              stm.stretcher                       ?? DEFAULT_FORM.serviceTimeStretcher,
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        otpOnTimeMaxMinutes:              Number(form.otpOnTimeMaxMinutes),
        otpLateMaxMinutes:                Number(form.otpLateMaxMinutes),
        defaultPickupWindowMinutesBefore: Number(form.defaultPickupWindowMinutesBefore),
        defaultPickupWindowMinutesAfter:  Number(form.defaultPickupWindowMinutesAfter),
        appointmentBufferMinutes:         Number(form.appointmentBufferMinutes),
        maxDeviationMiles:                Number(form.maxDeviationMiles),
        clusterWindowMinutes:             Number(form.clusterWindowMinutes),
        requireDriverAcknowledgement:     form.requireDriverAcknowledgement,
        manifestCutoffMinutes:            Number(form.manifestCutoffMinutes),
        allowReoptimizeAfterDispatch:     form.allowReoptimizeAfterDispatch,
        defaultPayBasis:                  form.defaultPayBasis,
        defaultPayRatePerTrip:            Number(form.defaultPayRatePerTrip),
        defaultPayRatePerMile:            Number(form.defaultPayRatePerMile),
        defaultPayPercentage:             Number(form.defaultPayPercentage),
        showDriverFinance:                form.showDriverFinance,
        onlineDriversOnly:                form.onlineDriversOnly,
        blockDispatchToOfflineDrivers:    form.blockDispatchToOfflineDrivers,
        requireCabBeforeDispatch:         form.requireCabBeforeDispatch,
        avgMphForOptimization:            Number(form.avgMphForOptimization),
        defaultMaxTripsPerRun:            Number(form.defaultMaxTripsPerRun),
        serviceTimeByMobility: {
          ambulatory:    Number(form.serviceTimeAmbulatory),
          wheelchair:    Number(form.serviceTimeWheelchair),
          wheelchair_xl: Number(form.serviceTimeWheelchairXl),
          stretcher:     Number(form.serviceTimeStretcher),
        },
      };
      await updateNemtSettings(payload);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const deductionPct = Number(form.defaultPayPercentage) || 0;
  const driverReceivesPct = Math.max(0, 100 - deductionPct);

  return (
    <AppLayout title="NEMT Settings" subtitle="OTP thresholds, scheduling defaults, driver pay, and visibility.">
      <div className="surface">
        {message && <div className="feedback success">{message}</div>}
        {error && <div className="feedback error">{error}</div>}

        {loading ? (
          <div className="skeleton" style={{ height: 480 }} />
        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>

            {/* OTP */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>On-time performance (OTP) thresholds</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="otpOnTimeMaxMinutes">On-time max minutes late</label>
                    <input
                      id="otpOnTimeMaxMinutes"
                      type="number" min="0"
                      value={form.otpOnTimeMaxMinutes}
                      onChange={set('otpOnTimeMaxMinutes')}
                    />
                    <small className="text-muted">Pickups within this window count as on-time.</small>
                  </div>
                  <div>
                    <label htmlFor="otpLateMaxMinutes">Late max minutes (before "very late")</label>
                    <input
                      id="otpLateMaxMinutes"
                      type="number" min="0"
                      value={form.otpLateMaxMinutes}
                      onChange={set('otpLateMaxMinutes')}
                    />
                    <small className="text-muted">Beyond this threshold trips are marked very late.</small>
                  </div>
                </div>
              </div>
            </section>

            {/* Pickup window */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Default pickup window</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="defaultPickupWindowMinutesBefore">Minutes early allowed</label>
                    <input
                      id="defaultPickupWindowMinutesBefore"
                      type="number" min="0"
                      value={form.defaultPickupWindowMinutesBefore}
                      onChange={set('defaultPickupWindowMinutesBefore')}
                    />
                  </div>
                  <div>
                    <label htmlFor="defaultPickupWindowMinutesAfter">Minutes late allowed</label>
                    <input
                      id="defaultPickupWindowMinutesAfter"
                      type="number" min="0"
                      value={form.defaultPickupWindowMinutesAfter}
                      onChange={set('defaultPickupWindowMinutesAfter')}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Optimizer */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Route optimizer</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="clusterWindowMinutes">Cluster window (minutes)</label>
                    <input
                      id="clusterWindowMinutes"
                      type="number" min="1"
                      value={form.clusterWindowMinutes}
                      onChange={set('clusterWindowMinutes')}
                    />
                    <small className="text-muted">Trips within this pickup-time window are grouped together.</small>
                  </div>
                  <div>
                    <label htmlFor="appointmentBufferMinutes">Appointment buffer (minutes)</label>
                    <input
                      id="appointmentBufferMinutes"
                      type="number" min="0"
                      value={form.appointmentBufferMinutes}
                      onChange={set('appointmentBufferMinutes')}
                    />
                    <small className="text-muted">Extra time added before each appointment when optimizing.</small>
                  </div>
                  <div>
                    <label htmlFor="maxDeviationMiles">Max deviation (miles)</label>
                    <input
                      id="maxDeviationMiles"
                      type="number" min="0" step="0.1"
                      value={form.maxDeviationMiles}
                      onChange={set('maxDeviationMiles')}
                    />
                    <small className="text-muted">Maximum extra distance allowed when grouping trips.</small>
                  </div>
                </div>
              </div>
            </section>

            {/* Dispatch & manifest */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Dispatch &amp; manifest</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="manifestCutoffMinutes">Manifest cutoff (minutes before pickup)</label>
                    <input
                      id="manifestCutoffMinutes"
                      type="number" min="0"
                      value={form.manifestCutoffMinutes}
                      onChange={set('manifestCutoffMinutes')}
                    />
                    <small className="text-muted">How far in advance drivers receive their manifest.</small>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.requireDriverAcknowledgement}
                      onChange={set('requireDriverAcknowledgement')}
                    />
                    Require driver to acknowledge manifest before starting
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.allowReoptimizeAfterDispatch}
                      onChange={set('allowReoptimizeAfterDispatch')}
                    />
                    Allow re-optimization after run has been dispatched
                  </label>
                </div>
              </div>
            </section>

            {/* Driver pay defaults */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Driver pay defaults</h3></div>
              <div className="panel-body">
                <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
                  These rules are applied automatically when a trip is created with an agency fare but
                  no explicit driver pay amount. You can always override pay on individual trips.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="defaultPayBasis">Default pay basis</label>
                  <select
                    id="defaultPayBasis"
                    value={form.defaultPayBasis}
                    onChange={set('defaultPayBasis')}
                  >
                    <option value="percentage">Percentage of agency fare (recommended)</option>
                    <option value="per_trip">Flat rate per trip</option>
                    <option value="per_mile">Rate per mile (calculated at completion)</option>
                  </select>
                </div>

                {form.defaultPayBasis === 'percentage' && (
                  <div className="form-grid">
                    <div>
                      <label htmlFor="defaultPayPercentage">Company deduction %</label>
                      <input
                        id="defaultPayPercentage"
                        type="number" min="0" max="100" step="0.1"
                        value={form.defaultPayPercentage}
                        onChange={set('defaultPayPercentage')}
                      />
                      <small className="text-muted">
                        Percentage the company keeps. Driver receives the remainder.
                      </small>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Driver receives</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>
                        {driverReceivesPct.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        e.g. $10 fare → driver gets ${(10 * driverReceivesPct / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {form.defaultPayBasis === 'per_trip' && (
                  <div className="form-grid">
                    <div>
                      <label htmlFor="defaultPayRatePerTrip">Flat rate per trip ($)</label>
                      <input
                        id="defaultPayRatePerTrip"
                        type="number" min="0" step="0.01"
                        value={form.defaultPayRatePerTrip}
                        onChange={set('defaultPayRatePerTrip')}
                      />
                      <small className="text-muted">Driver receives this amount for every completed trip.</small>
                    </div>
                  </div>
                )}

                {form.defaultPayBasis === 'per_mile' && (
                  <div className="form-grid">
                    <div>
                      <label htmlFor="defaultPayRatePerMile">Rate per mile ($/mi)</label>
                      <input
                        id="defaultPayRatePerMile"
                        type="number" min="0" step="0.01"
                        value={form.defaultPayRatePerMile}
                        onChange={set('defaultPayRatePerMile')}
                      />
                      <small className="text-muted">
                        Driver pay is calculated when the driver reports actual miles at trip completion.
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Operational controls */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Operational controls</h3></div>
              <div className="panel-body">
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <label htmlFor="avgMphForOptimization">Average MPH (for travel-time estimates)</label>
                    <input
                      id="avgMphForOptimization"
                      type="number" min="5" max="120"
                      value={form.avgMphForOptimization}
                      onChange={set('avgMphForOptimization')}
                    />
                    <small className="text-muted">Used to estimate whether trips fit in a run's window.</small>
                  </div>
                  <div>
                    <label htmlFor="defaultMaxTripsPerRun">Default max trips per run</label>
                    <input
                      id="defaultMaxTripsPerRun"
                      type="number" min="1" max="40"
                      value={form.defaultMaxTripsPerRun}
                      onChange={set('defaultMaxTripsPerRun')}
                    />
                    <small className="text-muted">Auto-assign will not exceed this per driver per day.</small>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.onlineDriversOnly}
                      onChange={set('onlineDriversOnly')}
                    />
                    Auto-assign only to drivers who are currently online
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.blockDispatchToOfflineDrivers}
                      onChange={set('blockDispatchToOfflineDrivers')}
                    />
                    Block dispatching runs to offline drivers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.requireCabBeforeDispatch}
                      onChange={set('requireCabBeforeDispatch')}
                    />
                    Require a cab number before a run can be dispatched
                  </label>
                </div>
              </div>
            </section>

            {/* Service time by mobility type */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Service time by mobility type (minutes)</h3></div>
              <div className="panel-body">
                <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
                  Time allocated at each stop based on the passenger's mobility needs. Used for scheduling estimates.
                </p>
                <div className="form-grid">
                  {[
                    ['serviceTimeAmbulatory', 'Ambulatory'],
                    ['serviceTimeWheelchair', 'Wheelchair'],
                    ['serviceTimeWheelchairXl', 'Wheelchair XL'],
                    ['serviceTimeStretcher', 'Stretcher'],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label htmlFor={field}>{label}</label>
                      <input
                        id={field}
                        type="number" min="0"
                        value={form[field]}
                        onChange={set(field)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Driver visibility */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header"><h3>Driver visibility</h3></div>
              <div className="panel-body">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.showDriverFinance}
                    onChange={set('showDriverFinance')}
                  />
                  Allow drivers to view their NEMT pay history in the driver app
                </label>
              </div>
            </section>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default NemtSettings;
