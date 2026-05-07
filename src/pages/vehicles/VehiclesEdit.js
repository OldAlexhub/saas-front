import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getVehicle, updateVehicle } from '../../services/vehicleService';

const emptyForm = {
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
};

const VehiclesEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inspectionUrl, setInspectionUrl] = useState('');

  useEffect(() => {
    const fetchVehicle = async () => {
      setFetching(true);
      setError('');
      try {
        const res = await getVehicle(id);
        const data = res.data?.vehicle || res.data?.data || res.data;
        if (data && typeof data === 'object') {
          const caps = data.nemtCapabilities || {};
          const capacity = data.nemtCapacity || {};
          setForm({
            ...emptyForm,
            cabNumber: data.cabNumber || '',
            vinNumber: data.vinNumber || '',
            licPlates: data.licPlates || '',
            regisExpiry: data.regisExpiry || '',
            year: data.year || '',
            annualInspection: data.annualInspection || '',
            make: data.make || '',
            model: data.model || '',
            color: data.color || '',
            nemtAmbulatory: caps.ambulatory !== false,
            nemtWheelchair: Boolean(caps.wheelchair),
            nemtWheelchairXL: Boolean(caps.wheelchairXL),
            nemtStretcher: Boolean(caps.stretcher),
            nemtAmbulatorySeats: String(capacity.ambulatorySeats ?? '4'),
            nemtWheelchairPositions: String(capacity.wheelchairPositions ?? '0'),
            nemtStretcherPositions: String(capacity.stretcherPositions ?? '0'),
            nemtMaxPassengerCount: String(capacity.maxPassengerCount ?? '4'),
          });
          setInspectionUrl(data.annualInspectionFileUrl || data.annualInspectionFile || '');
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to load vehicle';
        setError(msg);
      } finally {
        setFetching(false);
      }
    };

    fetchVehicle();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'annualInspection' || key === 'regisExpiry') {
            formData.append(key, value ? value.substring(0, 10) : '');
          } else {
            formData.append(key, value);
          }
        }
      });
      // File upload removed from edit form per request
      await updateVehicle(id, formData);
      navigate('/vehicles');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update vehicle';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <Link to="/vehicles" className="btn btn-ghost">
      Back to fleet
    </Link>
  );

  return (
    <AppLayout
      title="Update vehicle"
      subtitle="Keep inspection records and cab identifiers current."
      actions={actions}
    >
      <div className="surface">
        {fetching ? (
          <div className="skeleton" style={{ height: '420px' }} />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div>
                <h3>Vehicle profile</h3>
                <p>Update dispatch facing identifiers and specs.</p>
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
                    value={form.make || ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="model">Model</label>
                  <input
                    id="model"
                    type="text"
                    name="model"
                    value={form.model || ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="color">Color</label>
                  <input
                    id="color"
                    type="text"
                    name="color"
                    value={form.color || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>NEMT capability</h3>
                <p>Keep wheelchair, stretcher, and rider capacity current for trip assignment.</p>
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
                <p>Document renewals and supporting inspection paperwork.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="regisExpiry">Registration expiry</label>
                  <input
                    id="regisExpiry"
                    type="date"
                    name="regisExpiry"
                    value={form.regisExpiry ? form.regisExpiry.substring(0, 10) : ''}
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
                    value={form.annualInspection ? form.annualInspection.substring(0, 10) : ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  {inspectionUrl ? (
                    <p className="form-hint">
                      Current file on record: <a href={inspectionUrl} target="_blank" rel="noreferrer">View</a>
                    </p>
                  ) : (
                    <p className="form-hint">No inspection file on record.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div>{error && <div className="feedback error">{error}</div>}</div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating vehicle…' : 'Update vehicle'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default VehiclesEdit;
