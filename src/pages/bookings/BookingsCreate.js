import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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
    dispatchMethod: 'manual',
    wheelchairNeeded: false,
    noShowFeeApplied: false,
    pickupLat: '',
    pickupLon: '',
    dropoffLat: '',
    dropoffLon: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Default map position (Kissimmee, FL)
  const defaultCenter = useMemo(() => ({ lat: 28.2919557, lng: -81.4075713 }), []);
  const [pickupPosition, setPickupPosition] = useState(null);
  const [dropoffPosition, setDropoffPosition] = useState(null);
  const [mapFocus, setMapFocus] = useState('pickup');

  const activeMarkerPosition =
    mapFocus === 'pickup'
      ? pickupPosition || dropoffPosition || defaultCenter
      : dropoffPosition || pickupPosition || defaultCenter;

  const resolvedCenter = useMemo(() => {
    if (pickupPosition) return pickupPosition;
    if (dropoffPosition) return dropoffPosition;
    return defaultCenter;
  }, [defaultCenter, dropoffPosition, pickupPosition]);

  const formatLatLng = useCallback(
    (value) => (Number.isFinite(value) ? Number(value).toFixed(6) : ''),
    [],
  );

  const normalizePair = useCallback((lat, lng) => {
    const toNumber = (input) => {
      if (input === null || input === undefined) return Number.NaN;
      if (typeof input === 'number') return input;
      const trimmed = String(input).trim();
      if (trimmed === '') return Number.NaN;
      return Number(trimmed);
    };

    const latNum = toNumber(lat);
    const lngNum = toNumber(lng);

    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      return { lat: latNum, lng: lngNum };
    }

    return { lat: undefined, lng: undefined };
  }, []);

  const assignCoordinates = useCallback(
    (kind, latLng) => {
      if (kind === 'pickup') {
        setPickupPosition(latLng);
        setForm((prev) => ({
          ...prev,
          pickupLat: formatLatLng(latLng.lat),
          pickupLon: formatLatLng(latLng.lng),
        }));
      } else {
        setDropoffPosition(latLng);
        setForm((prev) => ({
          ...prev,
          dropoffLat: formatLatLng(latLng.lat),
          dropoffLon: formatLatLng(latLng.lng),
        }));
      }
    },
    [formatLatLng],
  );

  // Marker component to set pickup location on map click
  function LocationMarker() {
    useMapEvents({
      click(e) {
        assignCoordinates(mapFocus, e.latlng);
      },
    });
    return (
      <>
        {pickupPosition && (
          <Marker position={[pickupPosition.lat, pickupPosition.lng]}>
            <Popup>Pickup here</Popup>
          </Marker>
        )}
        {dropoffPosition && (
          <Marker position={[dropoffPosition.lat, dropoffPosition.lng]}>
            <Popup>Drop-off here</Popup>
          </Marker>
        )}
      </>
    );
  }

  function MapAutoCenter() {
    const map = useMap();
    useEffect(() => {
      if (!activeMarkerPosition) return;
      map.setView(activeMarkerPosition, map.getZoom());
    }, [activeMarkerPosition, map]);
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoordinateChange = (kind, axis, value) => {
    const key = `${kind}${axis === 'lat' ? 'Lat' : 'Lon'}`;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const resolveCoordinates = useCallback(
    async (label, lat, lng, address) => {
      const manual = normalizePair(lat, lng);
      if (Number.isFinite(manual.lat) && Number.isFinite(manual.lng)) {
        return manual;
      }

      if (!address) {
        return { lat: undefined, lng: undefined };
      }

      try {
        const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: address,
            format: 'json',
            limit: 1,
          },
          headers: {
            'Accept-Language': 'en',
          },
        });
        if (Array.isArray(geoRes.data) && geoRes.data.length > 0) {
          const { lat: gLat, lon: gLon } = geoRes.data[0];
          const parsed = normalizePair(parseFloat(gLat), parseFloat(gLon));
          if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
            if (label === 'pickup') {
              setPickupPosition(parsed);
              setForm((prev) => ({
                ...prev,
                pickupLat: formatLatLng(parsed.lat),
                pickupLon: formatLatLng(parsed.lng),
              }));
            } else {
              setDropoffPosition(parsed);
              setForm((prev) => ({
                ...prev,
                dropoffLat: formatLatLng(parsed.lat),
                dropoffLon: formatLatLng(parsed.lng),
              }));
            }
            return parsed;
          }
        }
      } catch (geoErr) {
        console.warn(`Geocoding ${label} failed:`, geoErr.message);
      }

      return { lat: undefined, lng: undefined };
    },
    [formatLatLng, normalizePair],
  );

  const handleLocate = useCallback(
    async (kind) => {
      const latKey = kind === 'pickup' ? 'pickupLat' : 'dropoffLat';
      const lngKey = kind === 'pickup' ? 'pickupLon' : 'dropoffLon';
      const addressKey = kind === 'pickup' ? 'pickupAddress' : 'dropoffAddress';

      await resolveCoordinates(kind, form[latKey], form[lngKey], form[addressKey]);
    },
    [form, resolveCoordinates],
  );

  useEffect(() => {
    const { lat, lng } = normalizePair(form.pickupLat, form.pickupLon);
    setPickupPosition((prev) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (prev && prev.lat === lat && prev.lng === lng) {
          return prev;
        }
        return { lat, lng };
      }
      return null;
    });
  }, [form.pickupLat, form.pickupLon, normalizePair]);

  useEffect(() => {
    const { lat, lng } = normalizePair(form.dropoffLat, form.dropoffLon);
    setDropoffPosition((prev) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (prev && prev.lat === lat && prev.lng === lng) {
          return prev;
        }
        return { lat, lng };
      }
      return null;
    });
  }, [form.dropoffLat, form.dropoffLon, normalizePair]);

  const normalizeCoordinate = useCallback((value) => {
    if (!Number.isFinite(value)) return undefined;
    return Math.round(value * 1e6) / 1e6;
  }, []);

  const buildGeoPoint = useCallback(
    (lat, lng) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const normalizedLat = normalizeCoordinate(lat);
      const normalizedLng = normalizeCoordinate(lng);

      if (normalizedLat === undefined || normalizedLng === undefined) {
        return null;
      }

      return {
        type: 'Point',
        coordinates: [normalizedLng, normalizedLat],
      };
    },
    [normalizeCoordinate],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const [{ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng }] = await Promise.all([
        resolveCoordinates('pickup', form.pickupLat, form.pickupLon, form.pickupAddress),
        resolveCoordinates('dropoff', form.dropoffLat, form.dropoffLon, form.dropoffAddress),
      ]);

      const pickupPoint = buildGeoPoint(pLat, pLng);
      if (!pickupPoint) {
        setError('Pickup coordinates are required. Click the map or refine the pickup address.');
        setLoading(false);
        return;
      }

      const dropoffPoint = buildGeoPoint(dLat, dLng);
      if (!dropoffPoint) {
        setError('Drop-off coordinates are required. Click the map or refine the drop-off address.');
        setLoading(false);
        return;
      }

      const pickupLat = normalizeCoordinate(pLat);
      const pickupLon = normalizeCoordinate(pLng);
      const dropoffLat = normalizeCoordinate(dLat);
      const dropoffLon = normalizeCoordinate(dLng);

      const payload = {
        customerName: form.customerName,
        phoneNumber: form.phoneNumber,
        pickupAddress: form.pickupAddress,
        pickupTime: form.pickupTime ? new Date(form.pickupTime).toISOString() : undefined,
        dropoffAddress: form.dropoffAddress,
        passengers: Number(form.passengers) || 1,
        notes: form.notes,
        dispatchMethod: form.dispatchMethod,
        wheelchairNeeded: Boolean(form.wheelchairNeeded),
        noShowFeeApplied: Boolean(form.noShowFeeApplied),
      };
      payload.pickupPoint = pickupPoint;
      payload.dropoffPoint = dropoffPoint;
      if (pickupLat !== undefined && pickupLon !== undefined) {
        payload.pickupLat = pickupLat;
        payload.pickupLon = pickupLon;
      }
      if (dropoffLat !== undefined && dropoffLon !== undefined) {
        payload.dropoffLat = dropoffLat;
        payload.dropoffLon = dropoffLon;
      }

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
                    onBlur={() => handleLocate('pickup')}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    onClick={() => handleLocate('pickup')}
                  >
                    Locate pickup on map
                  </button>
                  <div className="form-grid mini">
                    <div>
                      <label htmlFor="pickupLat">Pickup latitude</label>
                      <input
                        id="pickupLat"
                        type="number"
                        name="pickupLat"
                        step="0.00001"
                        value={form.pickupLat}
                        onChange={(event) => handleCoordinateChange('pickup', 'lat', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                    <div>
                      <label htmlFor="pickupLon">Pickup longitude</label>
                      <input
                        id="pickupLon"
                        type="number"
                        name="pickupLon"
                        step="0.00001"
                        value={form.pickupLon}
                        onChange={(event) => handleCoordinateChange('pickup', 'lon', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                  </div>
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
                    onBlur={() => handleLocate('dropoff')}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    onClick={() => handleLocate('dropoff')}
                  >
                    Locate drop-off on map
                  </button>
                  <div className="form-grid mini">
                    <div>
                      <label htmlFor="dropoffLat">Drop-off latitude</label>
                      <input
                        id="dropoffLat"
                        type="number"
                        name="dropoffLat"
                        step="0.00001"
                        value={form.dropoffLat}
                        onChange={(event) => handleCoordinateChange('dropoff', 'lat', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                    <div>
                      <label htmlFor="dropoffLon">Drop-off longitude</label>
                      <input
                        id="dropoffLon"
                        type="number"
                        name="dropoffLon"
                        step="0.00001"
                        value={form.dropoffLon}
                        onChange={(event) => handleCoordinateChange('dropoff', 'lon', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="dispatchMethod">Dispatch method</label>
                  <select
                    id="dispatchMethod"
                    name="dispatchMethod"
                    value={form.dispatchMethod}
                    onChange={handleChange}
                  >
                    <option value="manual">Manual</option>
                    <option value="auto">Auto assign</option>
                  </select>
                </div>
                <div className="checkbox-field">
                  <label htmlFor="wheelchairNeeded">
                    <input
                      id="wheelchairNeeded"
                      type="checkbox"
                      name="wheelchairNeeded"
                      checked={form.wheelchairNeeded}
                      onChange={handleCheckboxChange}
                    />
                    Wheelchair accessible vehicle required
                  </label>
                </div>
                <div className="checkbox-field">
                  <label htmlFor="noShowFeeApplied">
                    <input
                      id="noShowFeeApplied"
                      type="checkbox"
                      name="noShowFeeApplied"
                      checked={form.noShowFeeApplied}
                      onChange={handleCheckboxChange}
                    />
                    Apply no-show fee if rider cancels late
                  </label>
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
              <h3>Pickup & drop-off map</h3>
              <p>
                Click the map to place {mapFocus === 'pickup' ? 'pickup' : 'drop-off'} coordinates. Use the toggle below to
                switch which marker is active.
              </p>
            </div>
            <div className="map-wrapper">
              <MapContainer center={[resolvedCenter.lat, resolvedCenter.lng]} zoom={12} style={{ height: '320px', width: '100%' }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapAutoCenter />
                <LocationMarker />
              </MapContainer>
              <div className="map-toggle">
                <button
                  type="button"
                  className={`btn btn-ghost ${mapFocus === 'pickup' ? 'active' : ''}`}
                  onClick={() => setMapFocus('pickup')}
                >
                  Set pickup marker
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost ${mapFocus === 'dropoff' ? 'active' : ''}`}
                  onClick={() => setMapFocus('dropoff')}
                >
                  Set drop-off marker
                </button>
              </div>
              <div className="map-coordinates">
                <div>
                  <strong>Pickup:</strong>{' '}
                  {form.pickupLat && form.pickupLon
                    ? `${Number(form.pickupLat).toFixed(5)}, ${Number(form.pickupLon).toFixed(5)}`
                    : 'Not set'}
                </div>
                <div>
                  <strong>Drop-off:</strong>{' '}
                  {form.dropoffLat && form.dropoffLon
                    ? `${Number(form.dropoffLat).toFixed(5)}, ${Number(form.dropoffLon).toFixed(5)}`
                    : 'Not set'}
                </div>
              </div>
              <small>
                Addresses will auto-geocode if coordinates are missing, but confirming both markers prevents dispatch
                issues.
              </small>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BookingsCreate;
