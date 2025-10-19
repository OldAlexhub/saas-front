import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listActives } from '../../services/activeService';
import {
  assignBooking,
  changeStatus,
  getBooking,
  updateBooking,
} from '../../services/bookingService';
import { listVehicles } from '../../services/vehicleService';

const statusOptions = [
  { value: 'Pending', label: 'Scheduled' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'EnRoute', label: 'En route' },
  { value: 'PickedUp', label: 'Picked up' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'NoShow', label: 'No show' },
];

const BookingDetail = () => {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({
    customerName: '',
    phoneNumber: '',
    pickupAddress: '',
    dropoffAddress: '',
    pickupTime: '',
    notes: '',
    fare: '',
  });
  const [assignmentMode, setAssignmentMode] = useState('manual');
  const [assignment, setAssignment] = useState({ driverId: '', cabNumber: '' });
  const [statusForm, setStatusForm] = useState({ toStatus: '', reason: '', fee: '' });
  const [vehicles, setVehicles] = useState([]);
  const [actives, setActives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [bookingRes, vehiclesRes, activesRes] = await Promise.all([
          getBooking(id),
          listVehicles(),
          listActives(),
        ]);
        const bookingData = bookingRes.data?.booking || bookingRes.data?.data || bookingRes.data;
        const vehicleList =
          vehiclesRes.data?.vehicles || vehiclesRes.data?.results || vehiclesRes.data || [];
        const activeList =
          activesRes.data?.data || activesRes.data?.actives || activesRes.data || [];
        const normalizedActives = Array.isArray(activeList) ? activeList : [];

        setBooking(bookingData);
        setActives(normalizedActives);

        const rawDriverId =
          bookingData?.driverId ??
          bookingData?.driver?._id ??
          bookingData?.driver?._id?.toString?.();
        const initialDriverId = rawDriverId ? String(rawDriverId) : '';
        let initialCabNumber = bookingData?.cabNumber ?? bookingData?.assignedCab ?? '';
        if (initialCabNumber !== null && initialCabNumber !== undefined && initialCabNumber !== '') {
          initialCabNumber = String(initialCabNumber);
        } else {
          initialCabNumber = '';
        }
        const activeMatch = normalizedActives.find((active) => {
          const candidate = active?.driverId ?? active?._id;
          return candidate != null && String(candidate) === initialDriverId;
        });
        if (!initialCabNumber && activeMatch?.cabNumber) {
          initialCabNumber = String(activeMatch.cabNumber);
        }
        setForm({
          customerName: bookingData?.customerName || '',
          phoneNumber: bookingData?.phoneNumber || '',
          pickupAddress: bookingData?.pickupAddress || '',
          dropoffAddress: bookingData?.dropoffAddress || '',
          pickupTime: bookingData?.pickupTime ? bookingData.pickupTime.substring(0, 16) : '',
          notes: bookingData?.notes || '',
          fare: bookingData?.fare?.toString() || '',
        });
        setAssignment({
          driverId: initialDriverId,
          cabNumber: initialCabNumber,
        });
        setStatusForm({ toStatus: bookingData?.status || 'Pending', reason: '', fee: '' });
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to load booking';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const driverOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    actives.forEach((active) => {
      const value = active?.driverId ?? active?._id;
      const normalizedValue = value != null ? String(value) : '';
      if (!normalizedValue || seen.has(normalizedValue)) return;
      seen.add(normalizedValue);
      const name = `${active?.firstName || ''} ${active?.lastName || ''}`.trim() || normalizedValue || 'Active driver';
      const detailParts = [];
      if (active?.cabNumber) detailParts.push(`Cab ${active.cabNumber}`);
      if (active?.availability) detailParts.push(active.availability);
      const label = detailParts.length ? `${name} - ${detailParts.join(' - ')}` : name;
      options.push({ value: normalizedValue, label });
    });

    const currentDriverId =
      assignment.driverId || (booking?.driverId != null ? String(booking.driverId) : '');
    if (currentDriverId && !seen.has(currentDriverId)) {
      const fallbackLabel = booking?.driverName || currentDriverId;
      options.push({ value: currentDriverId, label: `${fallbackLabel} (inactive)` });
    }

    return options;
  }, [actives, assignment.driverId, booking?.driverId, booking?.driverName]);

  const vehicleOptions = useMemo(() => {
    const map = new Map();

    vehicles.forEach((vehicle) => {
      const rawValue = vehicle?.cabNumber ?? vehicle?._id;
      const value = rawValue != null ? String(rawValue) : '';
      if (!value) return;
      const label = `Cab ${vehicle?.cabNumber || vehicle?._id?.slice?.(-4) || ''}`.trim();
      map.set(value, label);
    });

    actives.forEach((active) => {
      if (!active?.cabNumber) return;
      const value = String(active.cabNumber);
      if (map.has(value)) return;
      const descriptors = [active?.make, active?.model, active?.color].filter(Boolean).join(' ');
      const label = descriptors
        ? `Cab ${active.cabNumber} (${descriptors})`
        : `Cab ${active.cabNumber}`;
      map.set(value, label);
    });

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [vehicles, actives]);

  const selectedActive = useMemo(
    () => {
      const normalized = assignment.driverId ? String(assignment.driverId) : '';
      if (!normalized) return undefined;
      return actives.find((active) => {
        const candidate = active?.driverId ?? active?._id;
        return candidate != null && String(candidate) === normalized;
      });
    },
    [actives, assignment.driverId],
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (event) => {
    const { name, value } = event.target;
    if (name === 'driverId') {
      setAssignment((prev) => {
        const next = { ...prev, [name]: value };
        const match = actives.find((active) => {
          const candidate = active?.driverId ?? active?._id;
          return candidate != null && String(candidate) === value;
        });
        if (match?.cabNumber) {
          next.cabNumber = String(match.cabNumber);
        }
        return next;
      });
    } else {
      setAssignment((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleStatusChange = (event) => {
    const { name, value } = event.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        pickupTime: form.pickupTime ? new Date(form.pickupTime).toISOString() : undefined,
        fare: form.fare ? Number(form.fare) : undefined,
      };
      const res = await updateBooking(id, payload);
      const updated = res.data?.data || res.data?.booking || null;
      setBooking((prev) => ({
        ...prev,
        ...(updated || {}),
        ...(updated ? {} : payload),
      }));
      setMessage('Booking details updated');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update booking';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (assignmentMode === 'auto') {
        const res = await assignBooking(id, { dispatchMethod: 'auto' });
        const updated = res.data?.data || res.data?.booking || {};
        setBooking((prev) => ({ ...prev, ...updated, needs_reassignment: false }));
        setMessage('Assignment queued for auto dispatch');
      } else {
        const payload = {
          driverId: assignment.driverId,
          cabNumber: assignment.cabNumber,
          dispatchMethod: 'manual',
        };
        const res = await assignBooking(id, payload);
        const updated = res.data?.data || res.data?.booking || {};
        setBooking((prev) => ({ ...prev, ...updated, needs_reassignment: false }));
        setMessage('Booking assigned to driver');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign booking';
      if (err.response?.data?.needsManual) {
        setBooking((prev) => (prev ? { ...prev, needs_reassignment: true } : prev));
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const submitStatusChange = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        toStatus: statusForm.toStatus,
        reason: statusForm.reason || undefined,
        fee: statusForm.fee ? Number(statusForm.fee) : undefined,
      };
      const res = await changeStatus(id, payload);
      const updated = res.data?.data || res.data?.booking || {};
      setBooking((prev) => ({ ...prev, ...updated }));
      const statusLabel =
        statusOptions.find((option) => option.value === payload.toStatus)?.label || payload.toStatus;
      setMessage(
        payload.toStatus === 'Cancelled'
          ? 'Booking cancelled.'
          : `Booking marked ${statusLabel}.`,
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change status';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <Link to="/bookings" className="btn btn-ghost">
      Back to list
    </Link>
  );

  const renderSummary = () => {
    if (!booking) return null;
    const statusLabel =
      statusOptions.find((option) => option.value === booking.status)?.label ||
      booking.status ||
      'Scheduled';
    return (
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <h3>Booking overview</h3>
          <span className={`badge ${booking.status === 'Completed' ? 'badge-success' : booking.status === 'Cancelled' ? 'badge-warning' : 'badge-info'}`}>
            {statusLabel}
          </span>
        </div>
        <div className="panel-body">
          <dl className="meta-grid">
            <div>
              <dt>Customer</dt>
              <dd>{booking.customerName || '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{booking.phoneNumber || '—'}</dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>{booking.pickupTime ? new Date(booking.pickupTime).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt>Pickup address</dt>
              <dd>{booking.pickupAddress || '—'}</dd>
            </div>
            <div>
              <dt>Drop-off</dt>
              <dd>{booking.dropoffAddress || '—'}</dd>
            </div>
            <div>
              <dt>Driver</dt>
              <dd>{booking.driverName || booking.driverId || 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Cab</dt>
              <dd>{booking.cabNumber || '—'}</dd>
            </div>
            <div>
              <dt>Fare</dt>
              <dd>{booking.fare ? `$${booking.fare}` : '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  };

  return (
    <AppLayout
      title={`Booking ${booking?.bookingId || id?.slice(-6) || ''}`.trim()}
      subtitle="Manage assignment, lifecycle and trip logistics from a single workspace."
      actions={actions}
    >
      <div className="surface">
        {loading ? (
          <div className="skeleton" style={{ height: '420px' }} />
        ) : (
          <>
            {message && <div className="feedback success">{message}</div>}
            {error && <div className="feedback error">{error}</div>}
            {booking?.needs_reassignment && (
              <div className="feedback warning">
                Automatic dispatch did not find an available driver. Assign manually or retry when more drivers are online.
              </div>
            )}
            {renderSummary()}

            <div className="form-grid two-column">
              <section className="panel">
                <form onSubmit={submitUpdate}>
                  <div className="panel-header">
                    <h3>Trip details</h3>
                  </div>
                  <div className="panel-body">
                    <div className="form-grid">
                      <div>
                        <label htmlFor="customerName">Customer name</label>
                        <input
                          id="customerName"
                          name="customerName"
                          type="text"
                          value={form.customerName}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="phoneNumber">Phone number</label>
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          value={form.phoneNumber}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="pickupAddress">Pickup address</label>
                        <input
                          id="pickupAddress"
                          name="pickupAddress"
                          type="text"
                          value={form.pickupAddress}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="dropoffAddress">Drop-off address</label>
                        <input
                          id="dropoffAddress"
                          name="dropoffAddress"
                          type="text"
                          value={form.dropoffAddress}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="pickupTime">Pickup time</label>
                        <input
                          id="pickupTime"
                          name="pickupTime"
                          type="datetime-local"
                          value={form.pickupTime}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="fare">Quoted fare</label>
                        <input
                          id="fare"
                          name="fare"
                          type="number"
                          step="0.01"
                          value={form.fare}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div className="full-width">
                        <label htmlFor="notes">Notes</label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          value={form.notes}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="panel-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      Save changes
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel">
                <form onSubmit={submitAssignment}>
                  <div className="panel-header">
                    <h3>Assignment</h3>
                  </div>
                  <div className="panel-body">
                    <div className="form-grid">
                      <div className="full-width">
                        <label htmlFor="assignmentMode">Mode</label>
                        <select
                          id="assignmentMode"
                          value={assignmentMode}
                          onChange={(e) => setAssignmentMode(e.target.value)}
                        >
                          <option value="manual">Manual</option>
                          <option value="auto">Auto assign</option>
                        </select>
                      </div>
                      {assignmentMode === 'manual' && (
                        <>
                          <div>
                            <label htmlFor="driverId">Driver</label>
                            <select
                              id="driverId"
                              name="driverId"
                              value={assignment.driverId}
                              onChange={handleAssignmentChange}
                            >
                              <option value="">Select driver…</option>
                              {driverOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {selectedActive && (
                            <div className="full-width" style={{ marginTop: '4px' }}>
                              <div
                                style={{
                                  border: '1px solid var(--surface-border)',
                                  borderRadius: '16px',
                                  padding: '16px',
                                  background: 'var(--surface-highlight)',
                                }}
                              >
                                <h4 style={{ margin: '0 0 12px' }}>Active driver snapshot</h4>
                                <dl className="meta-grid">
                                  <div>
                                    <dt>Cab</dt>
                                    <dd>{selectedActive.cabNumber || '—'}</dd>
                                  </div>
                                  <div>
                                    <dt>Plates</dt>
                                    <dd>{selectedActive.licPlates || '—'}</dd>
                                  </div>
                                  <div>
                                    <dt>Vehicle</dt>
                                    <dd>
                                      {[selectedActive.make, selectedActive.model, selectedActive.color]
                                        .filter(Boolean)
                                        .join(' ') || '—'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Status</dt>
                                    <dd>
                                      {[selectedActive.status, selectedActive.availability]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Location</dt>
                                    <dd>
                                      {(() => {
                                        const coords = Array.isArray(selectedActive?.currentLocation?.coordinates)
                                          ? selectedActive.currentLocation.coordinates
                                          : [];
                                        const [lng, lat] = coords;
                                        const hasCoords =
                                          Number.isFinite(lat) && Number.isFinite(lng);
                                        const formatted = hasCoords
                                          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                                          : '—';
                                        const updated = selectedActive?.currentLocation?.updatedAt
                                          ? new Date(selectedActive.currentLocation.updatedAt).toLocaleString()
                                          : null;
                                        return updated ? `${formatted} (updated ${updated})` : formatted;
                                      })()}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>HOS (driving today)</dt>
                                    <dd>
                                      {Number.isFinite(selectedActive?.hoursOfService?.drivingMinutesToday)
                                        ? `${selectedActive.hoursOfService.drivingMinutesToday} min`
                                        : '—'}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          )}
                          <div>
                            <label htmlFor="cabNumber">Cab number</label>
                            <select
                              id="cabNumber"
                              name="cabNumber"
                              value={assignment.cabNumber}
                              onChange={handleAssignmentChange}
                            >
                              <option value="">Select cab…</option>
                              {vehicleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="panel-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {assignmentMode === 'auto' ? 'Auto assign' : 'Assign booking'}
                    </button>
                  </div>
                </form>

                <form onSubmit={submitStatusChange} style={{ marginTop: '24px' }}>
                  <div className="panel-header">
                    <h3>Status controls</h3>
                  </div>
                  <div className="panel-body">
                    <div className="form-grid">
                      <div>
                        <label htmlFor="toStatus">New status</label>
                        <select
                          id="toStatus"
                          name="toStatus"
                          value={statusForm.toStatus}
                          onChange={handleStatusChange}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="reason">Reason</label>
                        <input
                          id="reason"
                          name="reason"
                          type="text"
                          value={statusForm.reason}
                          onChange={handleStatusChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="fee">Additional fee</label>
                        <input
                          id="fee"
                          name="fee"
                          type="number"
                          step="0.01"
                          value={statusForm.fee}
                          onChange={handleStatusChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="panel-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving.' : 'Update booking status'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default BookingDetail;
