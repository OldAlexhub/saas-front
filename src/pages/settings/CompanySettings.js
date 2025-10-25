import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { getCompanyProfile, updateCompanyProfile } from '../../services/companyService';

const defaultForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  notes: '',
  allowedStates: ['FL'],
  dispatchSettings: {
    maxDistanceMiles: 6,
    maxCandidates: 20,
    distanceStepsMiles: '1,2,3,4,5,6',
  },
    hosSettings: {
      MAX_ON_DUTY_HOURS: 12,
      REQUIRED_OFF_DUTY_HOURS: 12,
      LOOKBACK_WINDOW_HOURS: 24,
      RECORD_RETENTION_MONTHS: 12,
      ALLOW_ALTERNATE_RULES: false,
      ALERT_THRESHOLD_HOURS: 11.5,
    },
};

const CompanySettings = () => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let ignore = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getCompanyProfile();
        if (ignore) return;
        const data = res.data?.company;
        if (data && typeof data === 'object') {
          setForm({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            logoUrl: data.logoUrl || '',
            notes: data.notes || '',
            allowedStates: Array.isArray(data.allowedStates) && data.allowedStates.length > 0 ? data.allowedStates : defaultForm.allowedStates,
            dispatchSettings: {
              maxDistanceMiles: data.dispatchSettings?.maxDistanceMiles ?? defaultForm.dispatchSettings.maxDistanceMiles,
              maxCandidates: data.dispatchSettings?.maxCandidates ?? defaultForm.dispatchSettings.maxCandidates,
                distanceStepsMiles: Array.isArray(data.dispatchSettings?.distanceStepsMiles)
                  ? (data.dispatchSettings.distanceStepsMiles.join(',') )
                  : defaultForm.dispatchSettings.distanceStepsMiles,
            },
              hosSettings: {
                MAX_ON_DUTY_HOURS: data.hosSettings?.MAX_ON_DUTY_HOURS ?? defaultForm.hosSettings.MAX_ON_DUTY_HOURS,
                REQUIRED_OFF_DUTY_HOURS: data.hosSettings?.REQUIRED_OFF_DUTY_HOURS ?? defaultForm.hosSettings.REQUIRED_OFF_DUTY_HOURS,
                LOOKBACK_WINDOW_HOURS: data.hosSettings?.LOOKBACK_WINDOW_HOURS ?? defaultForm.hosSettings.LOOKBACK_WINDOW_HOURS,
                RECORD_RETENTION_MONTHS: data.hosSettings?.RECORD_RETENTION_MONTHS ?? defaultForm.hosSettings.RECORD_RETENTION_MONTHS,
                ALLOW_ALTERNATE_RULES: data.hosSettings?.ALLOW_ALTERNATE_RULES ?? defaultForm.hosSettings.ALLOW_ALTERNATE_RULES,
                ALERT_THRESHOLD_HOURS: data.hosSettings?.ALERT_THRESHOLD_HOURS ?? defaultForm.hosSettings.ALERT_THRESHOLD_HOURS,
              },
          });
        }
      } catch (err) {
        if (!ignore) {
          const message = err.response?.data?.message || 'Unable to load company profile.';
          setError(message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Full list of US states (codes and labels) for the multi-select.
  const STATE_OPTIONS = [
    { code: 'AL', label: 'Alabama' },{ code: 'AK', label: 'Alaska' },{ code: 'AZ', label: 'Arizona' },{ code: 'AR', label: 'Arkansas' },{ code: 'CA', label: 'California' },{ code: 'CO', label: 'Colorado' },{ code: 'CT', label: 'Connecticut' },{ code: 'DE', label: 'Delaware' },{ code: 'DC', label: 'District of Columbia' },{ code: 'FL', label: 'Florida' },{ code: 'GA', label: 'Georgia' },{ code: 'HI', label: 'Hawaii' },{ code: 'ID', label: 'Idaho' },{ code: 'IL', label: 'Illinois' },{ code: 'IN', label: 'Indiana' },{ code: 'IA', label: 'Iowa' },{ code: 'KS', label: 'Kansas' },{ code: 'KY', label: 'Kentucky' },{ code: 'LA', label: 'Louisiana' },{ code: 'ME', label: 'Maine' },{ code: 'MD', label: 'Maryland' },{ code: 'MA', label: 'Massachusetts' },{ code: 'MI', label: 'Michigan' },{ code: 'MN', label: 'Minnesota' },{ code: 'MS', label: 'Mississippi' },{ code: 'MO', label: 'Missouri' },{ code: 'MT', label: 'Montana' },{ code: 'NE', label: 'Nebraska' },{ code: 'NV', label: 'Nevada' },{ code: 'NH', label: 'New Hampshire' },{ code: 'NJ', label: 'New Jersey' },{ code: 'NM', label: 'New Mexico' },{ code: 'NY', label: 'New York' },{ code: 'NC', label: 'North Carolina' },{ code: 'ND', label: 'North Dakota' },{ code: 'OH', label: 'Ohio' },{ code: 'OK', label: 'Oklahoma' },{ code: 'OR', label: 'Oregon' },{ code: 'PA', label: 'Pennsylvania' },{ code: 'RI', label: 'Rhode Island' },{ code: 'SC', label: 'South Carolina' },{ code: 'SD', label: 'South Dakota' },{ code: 'TN', label: 'Tennessee' },{ code: 'TX', label: 'Texas' },{ code: 'UT', label: 'Utah' },{ code: 'VT', label: 'Vermont' },{ code: 'VA', label: 'Virginia' },{ code: 'WA', label: 'Washington' },{ code: 'WV', label: 'West Virginia' },{ code: 'WI', label: 'Wisconsin' },{ code: 'WY', label: 'Wyoming' }
  ];

  const handleAllowedStatesChange = (event) => {
    // single-select: store selected value as a one-element array to match server shape
    const value = event.target.value || '';
    setForm((prev) => ({ ...prev, allowedStates: value ? [value] : [] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Prepare payload
      const payload = { ...form };
      // Parse dispatch settings
      if (form.dispatchSettings) {
        const ds = {};
        const md = Number(form.dispatchSettings.maxDistanceMiles);
        if (Number.isFinite(md)) ds.maxDistanceMiles = md;
        const mc = Number(form.dispatchSettings.maxCandidates);
        if (Number.isFinite(mc)) ds.maxCandidates = mc;
        const stepsRaw = String(form.dispatchSettings.distanceStepsMiles || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isFinite(n) && n > 0);
        ds.distanceStepsMiles = stepsRaw;
        payload.dispatchSettings = ds;
        // Parse HOS settings
        if (form.hosSettings) {
          const h = {};
          const maxOn = Number(form.hosSettings.MAX_ON_DUTY_HOURS);
          if (Number.isFinite(maxOn)) h.MAX_ON_DUTY_HOURS = maxOn;
          const reqOff = Number(form.hosSettings.REQUIRED_OFF_DUTY_HOURS);
          if (Number.isFinite(reqOff)) h.REQUIRED_OFF_DUTY_HOURS = reqOff;
          const look = Number(form.hosSettings.LOOKBACK_WINDOW_HOURS);
          if (Number.isFinite(look)) h.LOOKBACK_WINDOW_HOURS = look;
          const retain = Number(form.hosSettings.RECORD_RETENTION_MONTHS);
          if (Number.isFinite(retain)) h.RECORD_RETENTION_MONTHS = retain;
          h.ALLOW_ALTERNATE_RULES = Boolean(form.hosSettings.ALLOW_ALTERNATE_RULES);
          const alertH = Number(form.hosSettings.ALERT_THRESHOLD_HOURS);
          if (Number.isFinite(alertH)) h.ALERT_THRESHOLD_HOURS = alertH;
          payload.hosSettings = h;
        }
      }

      await updateCompanyProfile(payload);
      setSuccess('Company profile updated successfully.');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update company profile.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="Company settings"
      subtitle="Manage the details used on receipts, reports and outbound emails."
    >
      <div className="panel" style={{ maxWidth: '720px', margin: '0 auto' }}>
        {loading ? (
          <div className="skeleton" style={{ height: '360px', borderRadius: '18px' }} />
        ) : (
          <form onSubmit={handleSubmit} className="panel-form">
            <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3>Company profile</h3>
                <p className="panel-subtitle">
                  These details appear on receipts, driver communications and exported reports.
                </p>
              </div>
              <div className="panel-actions">
                <span className="badge badge-info">
                  {form.name ? form.name : 'Brand name pending'}
                </span>
              </div>
            </div>

            <div className="panel-body">
              <div>
                <label htmlFor="name">Company name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="email">Billing email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="logoUrl">Logo URL</label>
                  <input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    value={form.logoUrl}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="notes">Additional notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Internal reminders or payment instructions."
                />
              </div>

              <div className="panel-section">
                <h4>Service area</h4>
                <p className="panel-subtitle">Select the US states where this service will operate.</p>
                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="allowedStates">Service state</label>
                  <select
                    id="allowedStates"
                    name="allowedStates"
                    value={Array.isArray(form.allowedStates) ? form.allowedStates[0] || '' : ''}
                    onChange={handleAllowedStatesChange}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    <option value="">Select a state</option>
                    {STATE_OPTIONS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label} ({s.code})
                      </option>
                    ))}
                  </select>
                  <p className="hint">Select the single US state where this service will operate.</p>
                </div>

                <h4>Dispatch settings</h4>
                <p className="panel-subtitle">Controls used for automatic dispatch behavior (radial search).</p>
                <div className="form-grid">
                  <div>
                    <label htmlFor="maxDistanceMiles">Max distance (miles)</label>
                    <input
                      id="maxDistanceMiles"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.dispatchSettings?.maxDistanceMiles ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, dispatchSettings: { ...p.dispatchSettings, maxDistanceMiles: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="maxCandidates">Max candidates</label>
                    <input
                      id="maxCandidates"
                      type="number"
                      min="1"
                      value={form.dispatchSettings?.maxCandidates ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, dispatchSettings: { ...p.dispatchSettings, maxCandidates: e.target.value } }))}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="distanceStepsMiles">Distance steps (miles)</label>
                  <input
                    id="distanceStepsMiles"
                    type="text"
                    value={form.dispatchSettings?.distanceStepsMiles ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, dispatchSettings: { ...p.dispatchSettings, distanceStepsMiles: e.target.value } }))}
                    placeholder="Comma-separated e.g. 1,2,3,4"
                  />
                  <p className="hint">Comma-separated list of radial search distances in miles. Values will be sanitized.</p>
                </div>
                
                <h4>Hours-of-Service (HOS) settings</h4>
                <p className="panel-subtitle">Configure driver hours-of-service rules used by the driver app and compliance checks.</p>
                <div className="form-grid">
                  <div>
                    <label htmlFor="MAX_ON_DUTY_HOURS">Max on-duty hours</label>
                    <input
                      id="MAX_ON_DUTY_HOURS"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.hosSettings?.MAX_ON_DUTY_HOURS ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, hosSettings: { ...p.hosSettings, MAX_ON_DUTY_HOURS: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="REQUIRED_OFF_DUTY_HOURS">Required off-duty hours</label>
                    <input
                      id="REQUIRED_OFF_DUTY_HOURS"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.hosSettings?.REQUIRED_OFF_DUTY_HOURS ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, hosSettings: { ...p.hosSettings, REQUIRED_OFF_DUTY_HOURS: e.target.value } }))}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div>
                    <label htmlFor="LOOKBACK_WINDOW_HOURS">Lookback window (hours)</label>
                    <input
                      id="LOOKBACK_WINDOW_HOURS"
                      type="number"
                      step="1"
                      min="1"
                      value={form.hosSettings?.LOOKBACK_WINDOW_HOURS ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, hosSettings: { ...p.hosSettings, LOOKBACK_WINDOW_HOURS: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="RECORD_RETENTION_MONTHS">Record retention (months)</label>
                    <input
                      id="RECORD_RETENTION_MONTHS"
                      type="number"
                      step="1"
                      min="1"
                      value={form.hosSettings?.RECORD_RETENTION_MONTHS ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, hosSettings: { ...p.hosSettings, RECORD_RETENTION_MONTHS: e.target.value } }))}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div>
                    <label htmlFor="ALLOW_ALTERNATE_RULES">Allow alternate rules</label>
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          id="ALLOW_ALTERNATE_RULES"
                          type="checkbox"
                          checked={Boolean(form.hosSettings?.ALLOW_ALTERNATE_RULES)}
                          onChange={(e) => setForm((p) => ({ ...p, hosSettings: { ...p.hosSettings, ALLOW_ALTERNATE_RULES: e.target.checked } }))}
                        />
                        <span className="hint">Enable only if taxicab rules allow the 15/10/70 alternate cycle.</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ALERT_THRESHOLD_HOURS">Alert threshold (hours)</label>
                    <input
                      id="ALERT_THRESHOLD_HOURS"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.hosSettings?.ALERT_THRESHOLD_HOURS ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, hosSettings: { ...p.hosSettings, ALERT_THRESHOLD_HOURS: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="feedback error">{error}</div>}
            {success && <div className="feedback success">{success}</div>}

            <div className="panel-footer" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default CompanySettings;
