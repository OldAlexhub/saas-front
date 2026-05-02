import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import {
  addDriver,
  importEnrollmeDriver,
  listEnrollmeDriverImportCandidates,
} from '../../services/driverService';

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
  const [enrollmeApplications, setEnrollmeApplications] = useState([]);
  const [selectedEnrollmeId, setSelectedEnrollmeId] = useState('');
  const [enrollmeLoading, setEnrollmeLoading] = useState(false);
  const [enrollmeImporting, setEnrollmeImporting] = useState(false);
  const [enrollmeError, setEnrollmeError] = useState('');
  const [enrollmeNotice, setEnrollmeNotice] = useState('');

  useEffect(() => {
    let active = true;
    setEnrollmeLoading(true);
    listEnrollmeDriverImportCandidates()
      .then((res) => {
        if (!active) return;
        const applications = res.data?.applications || [];
        setEnrollmeApplications(applications);
      })
      .catch((err) => {
        if (!active) return;
        setEnrollmeError(err.response?.data?.message || 'Failed to load EnrollMe applications');
      })
      .finally(() => {
        if (active) setEnrollmeLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedEnrollmeApplication = useMemo(
    () => enrollmeApplications.find((application) => application.id === selectedEnrollmeId) || null,
    [enrollmeApplications, selectedEnrollmeId],
  );

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

  const formatApiErrors = (data) => {
    const details = data?.errors;
    if (!Array.isArray(details) || details.length === 0) return '';
    return details
      .map((item) => {
        if (typeof item === 'string') return item;
        return [item.field, item.message].filter(Boolean).join(': ');
      })
      .filter(Boolean)
      .join(' ');
  };

  const handleEnrollmePrefill = () => {
    if (!selectedEnrollmeApplication) return;
    const prefill = selectedEnrollmeApplication.prefill || {};
    setForm((prev) => ({
      ...prev,
      ...prefill,
      ssn: prev.ssn,
    }));
    setEnrollmeError('');
    setEnrollmeNotice(`Prefilled from ${selectedEnrollmeApplication.name || selectedEnrollmeApplication.email}.`);
  };

  const handleEnrollmeImport = async () => {
    if (!selectedEnrollmeApplication) return;
    setEnrollmeError('');
    setEnrollmeNotice('');
    setEnrollmeImporting(true);
    try {
      await importEnrollmeDriver(selectedEnrollmeApplication.id);
      navigate('/drivers');
    } catch (err) {
      const data = err.response?.data;
      const detail = formatApiErrors(data);
      setEnrollmeError([data?.message || 'Failed to import EnrollMe application', detail].filter(Boolean).join(' '));
    } finally {
      setEnrollmeImporting(false);
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
        <div className="enrollme-import-section">
          <div>
            <h3>EnrollMe source</h3>
            <p>Use a completed EnrollMe application as an optional source for this driver record.</p>
          </div>
          <div className="enrollme-import-controls">
            <select
              value={selectedEnrollmeId}
              onChange={(event) => {
                setSelectedEnrollmeId(event.target.value);
                setEnrollmeError('');
                setEnrollmeNotice('');
              }}
              disabled={enrollmeLoading}
            >
              <option value="">{enrollmeLoading ? 'Loading EnrollMe applications...' : 'Select EnrollMe application'}</option>
              {enrollmeApplications.map((application) => (
                <option value={application.id} key={application.id}>
                  {(application.name || application.email || application.id)} - {application.status}
                  {application.canImport ? '' : ' - needs review'}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleEnrollmePrefill}
              disabled={!selectedEnrollmeApplication}
            >
              Prefill form
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleEnrollmeImport}
              disabled={!selectedEnrollmeApplication?.canImport || enrollmeImporting}
            >
              {enrollmeImporting ? 'Importing...' : 'Import driver'}
            </button>
          </div>
          {selectedEnrollmeApplication && (
            <div className="enrollme-import-details">
              <span>{selectedEnrollmeApplication.email || 'No email'}</span>
              <span>SSN {selectedEnrollmeApplication.hasSsn ? 'on file' : 'missing'}</span>
              <span>{selectedEnrollmeApplication.canImport ? 'Ready to import' : 'Cannot import yet'}</span>
            </div>
          )}
          {selectedEnrollmeApplication?.errors?.length > 0 && (
            <ul className="enrollme-import-errors">
              {selectedEnrollmeApplication.errors.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
          {enrollmeError && <div className="feedback error">{enrollmeError}</div>}
          {enrollmeNotice && <div className="feedback success">{enrollmeNotice}</div>}
        </div>

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
