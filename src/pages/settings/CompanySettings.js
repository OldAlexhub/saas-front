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
                      name="dispatchSettings.maxDistanceMiles"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.dispatchSettings?.maxDistanceMiles ?? ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="maxCandidates">Max candidates</label>
                    <input
                      id="maxCandidates"
                      name="dispatchSettings.maxCandidates"
                      type="number"
                      min="1"
                      value={form.dispatchSettings?.maxCandidates ?? ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="distanceStepsMiles">Distance steps (miles)</label>
                  <input
                    id="distanceStepsMiles"
                    name="dispatchSettings.distanceStepsMiles"
                    type="text"
                    value={form.dispatchSettings?.distanceStepsMiles ?? ''}
                    onChange={handleChange}
                    placeholder="Comma-separated e.g. 1,2,3,4"
                  />
                  <p className="hint">Comma-separated list of radial search distances in miles. Values will be sanitized.</p>
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
