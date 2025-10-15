import React, { useState } from 'react';
import axios from 'axios';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
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
      // Prepare payload and ensure coordinates are numbers.  If the user did not
      // click on the map to set a pickup location, attempt to geocode the
      // pickupAddress using the Nominatim API.  This helps prevent backend
      // errors when a pickupPoint is required for geospatial indexing.
      let lat = form.pickupLat;
      let lng = form.pickupLng;
      // Attempt geocoding if lat/lng are empty and address provided
      if ((!lat || !lng) && form.pickupAddress) {
        try {
          const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
              q: form.pickupAddress,
              format: 'json',
              limit: 1,
            },
            headers: {
              // Identify our client per Nominatim usage policy
              'Accept-Language': 'en',
            },
          });
          if (Array.isArray(geoRes.data) && geoRes.data.length > 0) {
            const { lat: gLat, lon: gLon } = geoRes.data[0];
            lat = parseFloat(gLat);
            lng = parseFloat(gLon);
            // Update form state so hidden fields reflect geocoded values
            setForm((prev) => ({ ...prev, pickupLat: lat, pickupLng: lng }));
          }
        } catch (geoErr) {
          // If geocoding fails, we proceed without coordinates. Backend will
          // reject but error will be caught and displayed.
          console.warn('Geocoding failed:', geoErr.message);
        }
      }
      const payload = {
        ...form,
        // ensure passengers is numeric
        passengers: Number(form.passengers),
        // include coordinates only if available
        pickupLat: lat ? Number(lat) : undefined,
        pickupLng: lng ? Number(lng) : undefined,
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

  const actions = (
    <Link to="/bookings" className="btn btn-ghost">
      Back to bookings
    </Link>
  );

  return (
    <AppLayout
      title="Create booking"
      subtitle="Capture trip details, assign a driver and get the ride scheduled in seconds."
      actions={actions}
    >
      <div className="grid-two">
        <div className="panel">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div>
                <h3>Rider details</h3>
                <p>Let us know who is travelling and how to reach them.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="customerName">Customer name</label>
                  <input
                    id="customerName"
                    type="text"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phoneNumber">Phone number</label>
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
                  <label htmlFor="passengers">Passengers</label>
                  <input
                    id="passengers"
                    type="number"
                    min="1"
                    name="passengers"
                    value={form.passengers}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Trip plan</h3>
                <p>Set the pickup, drop-off and scheduling info.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="pickupAddress">Pickup address</label>
                  <input
                    id="pickupAddress"
                    type="text"
                    name="pickupAddress"
                    value={form.pickupAddress}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pickupTime">Pickup time</label>
                  <input
                    id="pickupTime"
                    type="datetime-local"
                    name="pickupTime"
                    value={form.pickupTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dropoffAddress">Drop-off address</label>
                  <input
                    id="dropoffAddress"
                    type="text"
                    name="dropoffAddress"
                    value={form.dropoffAddress}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="notes">Internal notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Door codes, special requests, flight numbers..."
                  />
                </div>
              </div>
            </div>

            <input type="hidden" name="pickupLat" value={form.pickupLat} />
            <input type="hidden" name="pickupLng" value={form.pickupLng} />

            <div className="form-footer">
              <div>{error && <div className="feedback error">{error}</div>}</div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving booking…' : 'Save booking'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="form-section" style={{ marginBottom: 0 }}>
            <div>
              <h3>Pickup location</h3>
              <p>Click the map to refine the pickup coordinates for dispatch.</p>
            </div>
            <div className="map-wrapper">
              <MapContainer center={[position.lat, position.lng]} zoom={12} style={{ height: '320px', width: '100%' }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker />
              </MapContainer>
              <small>Click on the map to set pickup location.</small>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BookingsCreate;