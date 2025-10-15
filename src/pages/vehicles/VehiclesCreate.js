import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { addVehicle } from '../../services/vehicleService';

/**
 * Form for adding a new vehicle. Handles both text inputs and optional file
 * upload for annual inspection. Uses FormData to send multipart/form-data to the API.
 */
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
    setFile(e.target.files[0]);
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

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Add Vehicle</h2>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Cab Number</label>
              <input
                type="text"
                className="form-control"
                name="cabNumber"
                value={form.cabNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">VIN Number</label>
              <input
                type="text"
                className="form-control"
                name="vinNumber"
                value={form.vinNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">License Plates</label>
              <input
                type="text"
                className="form-control"
                name="licPlates"
                value={form.licPlates}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Registration Expiry</label>
              <input
                type="date"
                className="form-control"
                name="regisExpiry"
                value={form.regisExpiry}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Year</label>
              <input
                type="number"
                className="form-control"
                name="year"
                value={form.year}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Annual Inspection</label>
              <input
                type="date"
                className="form-control"
                name="annualInspection"
                value={form.annualInspection}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Make</label>
              <input
                type="text"
                className="form-control"
                name="make"
                value={form.make}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Model</label>
              <input
                type="text"
                className="form-control"
                name="model"
                value={form.model}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Color</label>
              <input
                type="text"
                className="form-control"
                name="color"
                value={form.color}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-12 mb-3">
              <label className="form-label">Annual Inspection File</label>
              <input
                type="file"
                className="form-control"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>
          {error && <div className="text-danger mb-3">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Vehicle'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Styles object unused due to Bootstrap usage
const styles = {};

export default VehiclesCreate;