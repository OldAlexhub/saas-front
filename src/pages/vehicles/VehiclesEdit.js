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
          setForm({
            ...emptyForm,
            ...data,
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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
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
