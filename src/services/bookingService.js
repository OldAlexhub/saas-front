import API from './api';

// Booking service functions to interact with booking endpoints.

/**
 * List bookings with optional query parameters.
 * @param {Object} params - Query filters (status, from, to, driverId, cabNumber).
 */
export const listBookings = (params = {}) => {
  return API.get(process.env.REACT_APP_BOOKINGS, { params });
};

/**
 * Retrieve a booking by id.
 * @param {string} id - Booking document id.
 */
export const getBooking = (id) => {
  return API.get(`${process.env.REACT_APP_BOOKINGS}/${id}`);
};

/**
 * Create a new booking.
 * @param {Object} data - Booking fields such as customerName, phoneNumber, pickupAddress, pickupTime, etc.
 */
export const createBooking = (data) => {
  return API.post(process.env.REACT_APP_BOOKINGS, data);
};

/**
 * Update an existing booking.
 * @param {string} id - Booking document id.
 * @param {Object} data - Partial fields to update.
 */
export const updateBooking = (id, data) => {
  return API.patch(`${process.env.REACT_APP_BOOKINGS}/${id}`, data);
};

/**
 * Assign a booking to a driver/cab or perform automatic assignment.
 * @param {string} id - Booking document id.
 * @param {Object} data - Contains driverId, cabNumber or mode="auto" and optional coordinates.
 */
export const assignBooking = (id, data) => {
  const template = process.env.REACT_APP_BOOKINGS_ASSIGN;
  const url = template ? template.replace(':id', id) : `${process.env.REACT_APP_BOOKINGS}/${id}/assign`;
  return API.patch(url, data);
};

/**
 * Change the status of a booking. Accepts toStatus and optionally reason or fee.
 * @param {string} id - Booking document id.
 * @param {Object} data - Contains toStatus and other related fields.
 */
export const changeStatus = (id, data) => {
  const template = process.env.REACT_APP_BOOKINGS_STATUS;
  const url = template ? template.replace(':id', id) : `${process.env.REACT_APP_BOOKINGS}/${id}/status`;
  return API.patch(url, data);
};

/**
 * Cancel a booking. Shortcut to setting status to "Cancelled".
 * @param {string} id - Booking document id.
 */
export const cancelBooking = (id) => {
  const template = process.env.REACT_APP_BOOKINGS_CANCEL;
  const url = template ? template.replace(':id', id) : `${process.env.REACT_APP_BOOKINGS}/${id}/cancel`;
  return API.post(url);
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