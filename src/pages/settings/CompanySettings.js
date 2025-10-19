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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCompanyProfile(form);
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
