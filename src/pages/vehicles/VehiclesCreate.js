import { useState } from 'react';
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
    nemtAmbulatory: true,
    nemtWheelchair: false,
    nemtWheelchairXL: false,
    nemtStretcher: false,
    nemtAmbulatorySeats: '4',
    nemtWheelchairPositions: '0',
    nemtStretcherPositions: '0',
    nemtMaxPassengerCount: '4',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      // Note: file uploads removed per UI change request
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
              <h3>NEMT capability</h3>
              <p>Used by automatic assignment to avoid sending the wrong vehicle type.</p>
            </div>
            <div className="form-grid">
              <label>
                <input
                  type="checkbox"
                  name="nemtAmbulatory"
                  checked={form.nemtAmbulatory}
                  onChange={handleChange}
                /> Ambulatory
              </label>
              <label>
                <input
                  type="checkbox"
                  name="nemtWheelchair"
                  checked={form.nemtWheelchair}
                  onChange={handleChange}
                /> Wheelchair
              </label>
              <label>
                <input
                  type="checkbox"
                  name="nemtWheelchairXL"
                  checked={form.nemtWheelchairXL}
                  onChange={handleChange}
                /> Wheelchair XL
              </label>
              <label>
                <input
                  type="checkbox"
                  name="nemtStretcher"
                  checked={form.nemtStretcher}
                  onChange={handleChange}
                /> Stretcher
              </label>
              <div>
                <label htmlFor="nemtAmbulatorySeats">Ambulatory seats</label>
                <input
                  id="nemtAmbulatorySeats"
                  type="number"
                  min="0"
                  name="nemtAmbulatorySeats"
                  value={form.nemtAmbulatorySeats}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="nemtWheelchairPositions">Wheelchair positions</label>
                <input
                  id="nemtWheelchairPositions"
                  type="number"
                  min="0"
                  name="nemtWheelchairPositions"
                  value={form.nemtWheelchairPositions}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="nemtStretcherPositions">Stretcher positions</label>
                <input
                  id="nemtStretcherPositions"
                  type="number"
                  min="0"
                  name="nemtStretcherPositions"
                  value={form.nemtStretcherPositions}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="nemtMaxPassengerCount">Max total passengers/attendants</label>
                <input
                  id="nemtMaxPassengerCount"
                  type="number"
                  min="1"
                  name="nemtMaxPassengerCount"
                  value={form.nemtMaxPassengerCount}
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
