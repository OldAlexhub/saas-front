import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const BOOKINGS_BASE = resolvePath(
  process.env.REACT_APP_BOOKINGS,
  process.env.REACT_APP_BOOKINGS_LIST,
  process.env.REACT_APP_BOOKINGS_CREATE,
  '/bookings',
);
const BOOKINGS_LIST = resolvePath(process.env.REACT_APP_BOOKINGS_LIST, BOOKINGS_BASE, '/bookings');
const BOOKINGS_CREATE = resolvePath(process.env.REACT_APP_BOOKINGS_CREATE, BOOKINGS_BASE, '/bookings');
const BOOKING_ID_TEMPLATE = `${BOOKINGS_BASE || '/bookings'}/:id`;
const BOOKING_ASSIGN_TEMPLATE = `${BOOKING_ID_TEMPLATE}/assign`;
const BOOKING_STATUS_TEMPLATE = `${BOOKING_ID_TEMPLATE}/status`;
const BOOKING_CANCEL_TEMPLATE = `${BOOKING_ID_TEMPLATE}/cancel`;

/**
 * List bookings with optional query parameters.
 * @param {Object} params - Query filters (status, from, to, driverId, cabNumber).
 */
export const listBookings = (params = {}) => {
  return API.get(BOOKINGS_LIST || '/bookings', { params });
};

/**
 * Retrieve a booking by id.
 * @param {string} id - Booking document id.
 */
export const getBooking = (id) => {
  return API.get(pathWithId(id, process.env.REACT_APP_BOOKINGS_GET, process.env.REACT_APP_BOOKINGS_UPDATE, BOOKING_ID_TEMPLATE));
};

/**
 * Create a new booking.
 * @param {Object} data - Booking fields such as customerName, phoneNumber, pickupAddress, pickupTime, etc.
 */
export const createBooking = (data) => {
  return API.post(BOOKINGS_CREATE || '/bookings', data);
};

/**
 * Update an existing booking.
 * @param {string} id - Booking document id.
 * @param {Object} data - Partial fields to update.
 */
export const updateBooking = (id, data) => {
  return API.patch(pathWithId(id, process.env.REACT_APP_BOOKINGS_UPDATE, process.env.REACT_APP_BOOKINGS_GET, BOOKING_ID_TEMPLATE), data);
};

/**
 * Assign a booking to a driver/cab or perform automatic assignment.
 * @param {string} id - Booking document id.
 * @param {Object} data - Contains driverId, cabNumber or mode="auto" and optional coordinates.
 */
export const assignBooking = (id, data) => {
  const url = pathWithId(id, process.env.REACT_APP_BOOKINGS_ASSIGN, BOOKING_ASSIGN_TEMPLATE);
  return API.patch(url || `${BOOKINGS_BASE || '/bookings'}/${id}/assign`, data);
};

/**
 * Change the status of a booking. Accepts toStatus and optionally reason or fee.
 * @param {string} id - Booking document id.
 * @param {Object} data - Contains toStatus and other related fields.
 */
export const changeStatus = (id, data) => {
  const url = pathWithId(id, process.env.REACT_APP_BOOKINGS_STATUS, BOOKING_STATUS_TEMPLATE);
  return API.patch(url || `${BOOKINGS_BASE || '/bookings'}/${id}/status`, data);
};

/**
 * Cancel a booking. Shortcut to setting status to "Cancelled".
 * @param {string} id - Booking document id.
 */
export const cancelBooking = (id) => {
  const url = pathWithId(id, process.env.REACT_APP_BOOKINGS_CANCEL, BOOKING_CANCEL_TEMPLATE);
  return API.post(url || `${BOOKINGS_BASE || '/bookings'}/${id}/cancel`);
};

export default {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  assignBooking,
  changeStatus,
  cancelBooking,
};
