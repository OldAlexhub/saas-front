import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { createBooking } from '../../services/bookingService';

/**
 * Form to create a new booking. Captures basic booking information
 * required by the backend. After successful creation it navigates back to
 * the bookings list.
 */
const BookingsCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    phoneNumber: '',
    pickupAddress: '',
    pickupTime: '',
    dropoffAddress: '',
    passengers: 1,
    notes: '',
    pickupLat: '',
    pickupLng: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Default map position (Kissimmee, FL)
  const [position, setPosition] = useState({ lat: 28.2919557, lng: -81.4075713 });

  // Marker component to set pickup location on map click
  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        setForm((prev) => ({ ...prev, pickupLat: e.latlng.lat, pickupLng: e.latlng.lng }));
      },
    });
    return position ? (
      <Marker position={[position.lat, position.lng]}>
        <Popup>Pickup here</Popup>
      </Marker>
    ) : null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        passengers: Number(form.passengers),
      };
      await createBooking(payload);
      navigate('/bookings');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create booking';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Add Booking</h2>
        <div className="row">
          <div className="col-md-6 mb-3">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
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
              <div className="mb-3">
                <label className="form-label">Pickup Address</label>
                <input
                  type="text"
                  className="form-control"
                  name="pickupAddress"
                  value={form.pickupAddress}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Pickup Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  name="pickupTime"
                  value={form.pickupTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Dropoff Address (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  name="dropoffAddress"
                  value={form.dropoffAddress}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Passengers</label>
                <input
                  type="number"
                  className="form-control"
                  name="passengers"
                  value={form.passengers}
                  onChange={handleChange}
                  min="1"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              {/* Hidden lat/lng fields for backend submission */}
              <input type="hidden" name="pickupLat" value={form.pickupLat} />
              <input type="hidden" name="pickupLng" value={form.pickupLng} />
              {error && <div className="text-danger mb-2">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Booking'}
              </button>
            </form>
          </div>
          <div className="col-md-6 mb-3">
            <div style={{ height: '400px', width: '100%' }}>
              <MapContainer center={[position.lat, position.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker />
              </MapContainer>
            </div>
            <small className="text-muted">Click on the map to set pickup location.</small>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles object unused since Bootstrap classes are used
const styles = {};

export default BookingsCreate;