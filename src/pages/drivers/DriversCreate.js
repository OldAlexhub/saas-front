import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { addDriver } from '../../services/driverService';

const DriversCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
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
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await addDriver(form);
      navigate('/drivers');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add driver';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const actions = (
    <Link to="/drivers" className="btn btn-ghost">
      Back to list
    </Link>
  );

  return (
    <AppLayout
      title="Add a new driver"
      subtitle="Capture identification, compliance and contact details in one pass."
      actions={actions}
    >
      <div className="surface">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div>
              <h3>Profile</h3>
              <p>Who is joining your fleet? Start with their basic details.</p>
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
                  value={form.dob}
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
              <p>Stay ahead of renewal deadlines and regulatory paperwork.</p>
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
                  value={form.dlExpiry}
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
                  value={form.dotExpiry}
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
                  value={form.cbiExpiry}
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
                  value={form.mvrExpiry}
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
                  value={form.fingerPrintsExpiry}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <div>
              {error && <div className="feedback error">{error}</div>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving driver…' : 'Save driver'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default DriversCreate;