import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const BOOKING_LIST_PATH = resolvePath(process.env.REACT_APP_BOOKINGS_LIST, '/bookings');
const BOOKING_ADD_PATH = resolvePath(
  process.env.REACT_APP_BOOKINGS_ADD,
  BOOKING_LIST_PATH,
  '/bookings',
);
const BOOKING_ID_TEMPLATE = resolvePath(
  process.env.REACT_APP_BOOKINGS_GET,
  process.env.REACT_APP_BOOKINGS_UPDATE,
  `${BOOKING_LIST_PATH || '/bookings'}/:id`,
  '/bookings/:id',
);
const BOOKING_ASSIGN_TEMPLATE = resolvePath(
  process.env.REACT_APP_BOOKINGS_ASSIGN,
  `${BOOKING_ID_TEMPLATE || '/bookings/:id'}/assign`,
  `${BOOKING_LIST_PATH || '/bookings'}/:id/assign`,
  '/bookings/:id/assign',
);
const BOOKING_STATUS_TEMPLATE = resolvePath(
  process.env.REACT_APP_BOOKINGS_STATUS,
  `${BOOKING_ID_TEMPLATE || '/bookings/:id'}/status`,
  `${BOOKING_LIST_PATH || '/bookings'}/:id/status`,
  '/bookings/:id/status',
);
const BOOKING_CANCEL_TEMPLATE = resolvePath(
  process.env.REACT_APP_BOOKINGS_CANCEL,
  `${BOOKING_ID_TEMPLATE || '/bookings/:id'}/cancel`,
  `${BOOKING_LIST_PATH || '/bookings'}/:id/cancel`,
  '/bookings/:id/cancel',
);

/**
 * List bookings with optional query parameters.
 * @param {Object} params - Query filters (status, from, to, driverId, cabNumber).
 */
export const listBookings = (params = {}) => {
  return API.get(BOOKING_LIST_PATH || '/bookings', { params });
};

/**
 * Retrieve a booking by id.
 * @param {string} id - Booking document id.
 */
export const getBooking = (id) => {
  return API.get(
      pathWithId(
        id,
        process.env.REACT_APP_BOOKINGS_GET,
        process.env.REACT_APP_BOOKINGS_UPDATE,
        BOOKING_ID_TEMPLATE,
      ) || `/bookings/${id}`,
  );
};

/**
 * Create a new booking.
 * @param {Object} data - Booking fields such as customerName, phoneNumber, pickupAddress, pickupTime, etc.
 */
export const createBooking = (data) => {
  return API.post(BOOKING_ADD_PATH || '/bookings', data);
};

/**
 * Update an existing booking.
 * @param {string} id - Booking document id.
 * @param {Object} data - Partial fields to update.
 */
export const updateBooking = (id, data) => {
  return API.patch(
    pathWithId(
      id,
      process.env.REACT_APP_BOOKINGS_UPDATE,
      process.env.REACT_APP_BOOKINGS_GET,
      BOOKING_ID_TEMPLATE,
    ) || `/bookings/${id}`,
    data,
  );
};

/**
 * Assign a booking to a driver/cab or perform automatic assignment.
 * @param {string} id - Booking document id.
 * @param {Object} data - Contains driverId, cabNumber or mode="auto" and optional coordinates.
 */
export const assignBooking = (id, data) => {
  const url =
    pathWithId(
      id,
      process.env.REACT_APP_BOOKINGS_ASSIGN,
      BOOKING_ASSIGN_TEMPLATE,
    ) || `${BOOKING_LIST_PATH || '/bookings'}/${id}/assign`;
  return API.patch(url, data);
};

/**
 * Change the status of a booking. Accepts toStatus and optionally reason or fee.
 * @param {string} id - Booking document id.
 * @param {Object} data - Contains toStatus and other related fields.
 */
export const changeStatus = (id, data) => {
  const url =
    pathWithId(
      id,
      process.env.REACT_APP_BOOKINGS_STATUS,
      BOOKING_STATUS_TEMPLATE,
    ) || `${BOOKING_LIST_PATH || '/bookings'}/${id}/status`;
  return API.patch(url, data);
};

/**
 * Cancel a booking. Shortcut to setting status to "Cancelled".
 * @param {string} id - Booking document id.
 */
export const cancelBooking = (id) => {
  const url =
    pathWithId(
      id,
      process.env.REACT_APP_BOOKINGS_CANCEL,
      BOOKING_CANCEL_TEMPLATE,
    ) || `${BOOKING_LIST_PATH || '/bookings'}/${id}/cancel`;
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
