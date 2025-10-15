import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import {
  addActive,
  getActive,
  updateActive,
} from '../../services/activeService';
import { listDrivers } from '../../services/driverService';
import { listVehicles } from '../../services/vehicleService';

const defaultForm = {
  driverId: '',
  cabNumber: '',
  firstName: '',
  lastName: '',
  licPlates: '',
  make: '',
  model: '',
  color: '',
  status: 'Active',
  availability: 'Online',
  lat: '',
  lng: '',
  hoursOfService: {
    totalHours: '',
    drivingHours: '',
    breakMinutes: '',
  },
};

const ActiveManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(defaultForm);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      setError('');
      try {
        const [driverRes, vehicleRes] = await Promise.all([listDrivers(), listVehicles()]);
        const driverList =
          driverRes.data?.drivers || driverRes.data?.results || driverRes.data || [];
        const vehicleList =
          vehicleRes.data?.vehicles || vehicleRes.data?.results || vehicleRes.data || [];
        setDrivers(Array.isArray(driverList) ? driverList : []);
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to fetch roster options';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const fetchActive = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getActive(id);
        const data = res.data?.active || res.data?.data || res.data;
        if (data && typeof data === 'object') {
          setForm({
            driverId: data.driverId || '',
            cabNumber: data.cabNumber || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            licPlates: data.licPlates || '',
            make: data.make || '',
            model: data.model || '',
            color: data.color || '',
            status: data.status || 'Active',
            availability: data.availability || 'Online',
            lat: data.currentLocation?.coordinates?.[1]?.toString() || '',
            lng: data.currentLocation?.coordinates?.[0]?.toString() || '',
            hoursOfService: {
              totalHours: data.hoursOfService?.totalHours?.toString() || '',
              drivingHours: data.hoursOfService?.drivingHours?.toString() || '',
              breakMinutes: data.hoursOfService?.breakMinutes?.toString() || '',
            },
          });
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to load active record';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchActive();
  }, [id, isEditing]);

  const driverOptions = useMemo(
    () => drivers.map((driver) => ({
      value: driver._id || driver.id,
      label: `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.email || 'Unnamed driver',
      raw: driver,
    })),
    [drivers],
  );

  const vehicleOptions = useMemo(
    () => vehicles.map((vehicle) => ({
      value: vehicle.cabNumber || vehicle._id,
      label: `Cab ${vehicle.cabNumber || vehicle._id?.slice(-4) || ''}`.trim(),
      raw: vehicle,
    })),
    [vehicles],
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name.startsWith('hoursOfService.')) {
      const key = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        hoursOfService: {
          ...prev.hoursOfService,
          [key]: value,
        },
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDriverSelect = (event) => {
    const { value } = event.target;
    const selected = driverOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      driverId: value,
      firstName: selected?.raw?.firstName || prev.firstName,
      lastName: selected?.raw?.lastName || prev.lastName,
    }));
  };

  const handleVehicleSelect = (event) => {
    const { value } = event.target;
    const selected = vehicleOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      cabNumber: selected?.raw?.cabNumber || value,
      licPlates: selected?.raw?.licPlates || prev.licPlates,
      make: selected?.raw?.make || prev.make,
      model: selected?.raw?.model || prev.model,
      color: selected?.raw?.color || prev.color,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      driverId: form.driverId,
      cabNumber: form.cabNumber,
      firstName: form.firstName,
      lastName: form.lastName,
      licPlates: form.licPlates,
      make: form.make,
      model: form.model,
      color: form.color,
      status: form.status,
      availability: form.availability,
      hoursOfService: {
        totalHours: form.hoursOfService.totalHours ? Number(form.hoursOfService.totalHours) : undefined,
        drivingHours: form.hoursOfService.drivingHours ? Number(form.hoursOfService.drivingHours) : undefined,
        breakMinutes: form.hoursOfService.breakMinutes ? Number(form.hoursOfService.breakMinutes) : undefined,
      },
    };

    if (form.lat && form.lng) {
      payload.lat = Number(form.lat);
      payload.lng = Number(form.lng);
    }

    if (!payload.hoursOfService.totalHours && !payload.hoursOfService.drivingHours && !payload.hoursOfService.breakMinutes) {
      delete payload.hoursOfService;
    }

    try {
      if (isEditing) {
        await updateActive(id, payload);
      } else {
        await addActive(payload);
      }
      navigate('/actives');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save active record';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <>
      <Link to="/actives" className="btn btn-ghost">
        Back to roster
      </Link>
    </>
  );

  const title = isEditing ? 'Update active assignment' : 'Activate a driver';
  const subtitle = isEditing
    ? 'Tune availability, cab assignment and duty metrics for this driver.'
    : 'Pair a compliant driver with a ready vehicle and mark them active.';

  return (
    <AppLayout title={title} subtitle={subtitle} actions={actions}>
      <div className="surface">
        {loading ? (
          <div className="skeleton" style={{ height: '440px' }} />
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="feedback error">{error}</div>}
            <div className="form-section">
              <div>
                <h3>Roster selection</h3>
                <p>Pull driver and vehicle data directly from the source directories.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="driverId">Driver</label>
                  <select id="driverId" name="driverId" value={form.driverId} onChange={handleDriverSelect} required>
                    <option value="">Select driver…</option>
                    {driverOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cabNumber">Cab</label>
                  <select id="cabNumber" name="cabNumber" value={form.cabNumber} onChange={handleVehicleSelect} required>
                    <option value="">Select cab…</option>
                    {vehicleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="licPlates">License plate</label>
                  <input
                    id="licPlates"
                    name="licPlates"
                    type="text"
                    value={form.licPlates}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="make">Make</label>
                  <input id="make" name="make" type="text" value={form.make} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="model">Model</label>
                  <input id="model" name="model" type="text" value={form.model} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="color">Color</label>
                  <input id="color" name="color" type="text" value={form.color} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Status & availability</h3>
                <p>Control whether the driver is dispatchable and how they appear on the map.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" value={form.status} onChange={handleInputChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="availability">Availability</label>
                  <select
                    id="availability"
                    name="availability"
                    value={form.availability}
                    onChange={handleInputChange}
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="lat">Latitude</label>
                  <input
                    id="lat"
                    name="lat"
                    type="number"
                    step="0.000001"
                    value={form.lat}
                    onChange={handleInputChange}
                    placeholder="39.7392"
                  />
                </div>
                <div>
                  <label htmlFor="lng">Longitude</label>
                  <input
                    id="lng"
                    name="lng"
                    type="number"
                    step="0.000001"
                    value={form.lng}
                    onChange={handleInputChange}
                    placeholder="-104.9903"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Hours of service</h3>
                <p>Log the driver\'s on-duty totals to enforce compliance.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="hoursOfService.totalHours">Total hours on duty</label>
                  <input
                    id="hoursOfService.totalHours"
                    name="hoursOfService.totalHours"
                    type="number"
                    step="0.1"
                    value={form.hoursOfService.totalHours}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="hoursOfService.drivingHours">Driving hours</label>
                  <input
                    id="hoursOfService.drivingHours"
                    name="hoursOfService.drivingHours"
                    type="number"
                    step="0.1"
                    value={form.hoursOfService.drivingHours}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="hoursOfService.breakMinutes">Break minutes</label>
                  <input
                    id="hoursOfService.breakMinutes"
                    name="hoursOfService.breakMinutes"
                    type="number"
                    step="1"
                    value={form.hoursOfService.breakMinutes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div />
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Update active' : 'Activate driver'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default ActiveManage;
