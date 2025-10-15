import API from './api';

// Active service provides functions to interact with the actives API.

/**
 * List active drivers with optional filters.
 * @param {Object} params - Query parameters like status, availability, lat, lng, radius.
 */
export const listActives = (params = {}) => {
  return API.get(process.env.REACT_APP_ACTIVES, { params });
};

/**
 * Fetch a single active record by id.
 * @param {string} id - Active document id.
 */
export const getActive = (id) => {
  return API.get(`${process.env.REACT_APP_ACTIVES}/${id}`);
};

/**
 * Create a new active record.
 * @param {Object} data - Active fields.
 */
export const addActive = (data) => {
  return API.post(process.env.REACT_APP_ACTIVES, data);
};

/**
 * Update an existing active record.
 * @param {string} id - Active document id.
 * @param {Object} data - Fields to update.
 */
export const updateActive = (id, data) => {
  return API.put(`${process.env.REACT_APP_ACTIVES}/${id}`, data);
};

/**
 * Update the status (Active/Inactive) for an active record.
 * @param {string} id - Active document id.
 * @param {string} status - New status, "Active" or "Inactive".
 */
export const updateStatus = (id, status) => {
  return API.put(`${process.env.REACT_APP_ACTIVES}/${id}/status`, { status });
};

/**
 * Update the availability (Online/Offline) for an active record.
 * @param {string} id - Active document id.
 * @param {string} availability - New availability, "Online" or "Offline".
 */
export const updateAvailability = (id, availability) => {
  return API.put(`${process.env.REACT_APP_ACTIVES}/${id}/availability`, { availability });
};

export default {
  listActives,
  getActive,
  addActive,
  updateActive,
  updateStatus,
  updateAvailability,
};