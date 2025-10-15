import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { addDriver } from '../../services/driverService';

/**
 * Form for creating a new driver. Captures all required fields defined in the
 * backend and submits them to the API. On success it redirects back to
 * the drivers list. Validation errors returned from the server are displayed.
 */
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

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Add Driver</h2>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-control"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-control"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">License Number</label>
              <input
                type="text"
                className="form-control"
                name="dlNumber"
                value={form.dlNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">DL Expiry</label>
              <input
                type="date"
                className="form-control"
                name="dlExpiry"
                value={form.dlExpiry}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">DOT Expiry</label>
              <input
                type="date"
                className="form-control"
                name="dotExpiry"
                value={form.dotExpiry}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Full Address</label>
              <input
                type="text"
                className="form-control"
                name="fullAddress"
                value={form.fullAddress}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">SSN</label>
              <input
                type="text"
                className="form-control"
                name="ssn"
                value={form.ssn}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">CBI Expiry</label>
              <input
                type="date"
                className="form-control"
                name="cbiExpiry"
                value={form.cbiExpiry}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">MVR Expiry</label>
              <input
                type="date"
                className="form-control"
                name="mvrExpiry"
                value={form.mvrExpiry}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">FingerPrints Expiry</label>
              <input
                type="date"
                className="form-control"
                name="fingerPrintsExpiry"
                value={form.fingerPrintsExpiry}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          {error && <div className="text-danger mb-3">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Driver'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Styles object is unused since Bootstrap classes handle styling
const styles = {};

export default DriversCreate;