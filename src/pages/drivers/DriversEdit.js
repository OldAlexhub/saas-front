import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getDriver, updateDriver } from '../../services/driverService';

const emptyForm = {
  firstName: '',
  lastName: '',
  dlNumber: '',
  email: '',
  dob: '',
  dlExpiry: '',
  dotExpiry: '',
  fullAddress: '',
  ssn: '',
  phoneNumber: '',
  cbiExpiry: '',
  mvrExpiry: '',
  fingerPrintsExpiry: '',
};

const DriversEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDriver = async () => {
      setFetching(true);
      setError('');
      try {
        const res = await getDriver(id);
        const data = res.data?.driver || res.data?.data || res.data;
        if (data && typeof data === 'object') {
          setForm({
            ...emptyForm,
            ...data,
          });
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to load driver';
        setError(msg);
      } finally {
        setFetching(false);
      }
    };

    fetchDriver();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateDriver(id, form);
      navigate('/drivers');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update driver';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <Link to="/drivers" className="btn btn-ghost">
      Back to list
    </Link>
  );

  return (
    <AppLayout
      title="Update driver profile"
      subtitle="Keep personal, compliance and contact details accurate."
      actions={actions}
    >
      <div className="surface">
        {fetching ? (
          <div className="skeleton" style={{ height: '420px' }} />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div>
                <h3>Profile</h3>
                <p>Review core identity information before saving.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dob">Date of birth</label>
                  <input
                    id="dob"
                    type="date"
                    name="dob"
                    value={form.dob ? form.dob.substring(0, 10) : ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phoneNumber">Phone</label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fullAddress">Residential address</label>
                  <input
                    id="fullAddress"
                    type="text"
                    name="fullAddress"
                    value={form.fullAddress}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ssn">SSN</label>
                  <input
                    id="ssn"
                    type="text"
                    name="ssn"
                    value={form.ssn}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>License & compliance</h3>
                <p>Keep regulatory documents renewed and on file.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="dlNumber">License number</label>
                  <input
                    id="dlNumber"
                    type="text"
                    name="dlNumber"
                    value={form.dlNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dlExpiry">License expiry</label>
                  <input
                    id="dlExpiry"
                    type="date"
                    name="dlExpiry"
                    value={form.dlExpiry ? form.dlExpiry.substring(0, 10) : ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dotExpiry">DOT medical expiry</label>
                  <input
                    id="dotExpiry"
                    type="date"
                    name="dotExpiry"
                    value={form.dotExpiry ? form.dotExpiry.substring(0, 10) : ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cbiExpiry">CBI clearance expiry</label>
                  <input
                    id="cbiExpiry"
                    type="date"
                    name="cbiExpiry"
                    value={form.cbiExpiry ? form.cbiExpiry.substring(0, 10) : ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="mvrExpiry">MVR expiry</label>
                  <input
                    id="mvrExpiry"
                    type="date"
                    name="mvrExpiry"
                    value={form.mvrExpiry ? form.mvrExpiry.substring(0, 10) : ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fingerPrintsExpiry">Fingerprint card expiry</label>
                  <input
                    id="fingerPrintsExpiry"
                    type="date"
                    name="fingerPrintsExpiry"
                    value={form.fingerPrintsExpiry ? form.fingerPrintsExpiry.substring(0, 10) : ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div>{error && <div className="feedback error">{error}</div>}</div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating driver…' : 'Update driver'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default DriversEdit;
