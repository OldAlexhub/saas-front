import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { addVehicle } from '../../services/vehicleService';

const VehiclesCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cabNumber: '',
    vinNumber: '',
    licPlates: '',
    regisExpiry: '',
    year: '',
    annualInspection: '',
    make: '',
    model: '',
    color: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') {
          formData.append(key, value);
        }
      });
      if (file) {
        formData.append('annualInspectionFile', file);
      }
      await addVehicle(formData);
      navigate('/vehicles');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add vehicle';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const actions = (
    <Link to="/vehicles" className="btn btn-ghost">
      Back to fleet
    </Link>
  );

  return (
    <AppLayout
      title="Register a vehicle"
      subtitle="Document inspection data and identifiers before the vehicle hits the road."
      actions={actions}
    >
      <div className="surface">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div>
              <h3>Vehicle profile</h3>
              <p>Core identifiers that help dispatchers assign the right cab quickly.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="cabNumber">Cab number</label>
                <input
                  id="cabNumber"
                  type="text"
                  name="cabNumber"
                  value={form.cabNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="vinNumber">VIN</label>
                <input
                  id="vinNumber"
                  type="text"
                  name="vinNumber"
                  value={form.vinNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="licPlates">License plate</label>
                <input
                  id="licPlates"
                  type="text"
                  name="licPlates"
                  value={form.licPlates}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="year">Model year</label>
                <input
                  id="year"
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="make">Make</label>
                <input
                  id="make"
                  type="text"
                  name="make"
                  value={form.make}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="model">Model</label>
                <input
                  id="model"
                  type="text"
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="color">Color</label>
                <input
                  id="color"
                  type="text"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div>
              <h3>Compliance</h3>
              <p>Track renewals and upload supporting inspection documentation.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="regisExpiry">Registration expiry</label>
                <input
                  id="regisExpiry"
                  type="date"
                  name="regisExpiry"
                  value={form.regisExpiry}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="annualInspection">Annual inspection</label>
                <input
                  id="annualInspection"
                  type="date"
                  name="annualInspection"
                  value={form.annualInspection}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="inspectionUpload">Upload inspection proof (PDF or image)</label>
                <input
                  id="inspectionUpload"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <div>{error && <div className="feedback error">{error}</div>}</div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving vehicle…' : 'Save vehicle'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default VehiclesCreate;