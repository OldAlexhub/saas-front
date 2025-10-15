import API from './api';

// Driver service encapsulates API interactions for driver resources.

/**
 * Fetch a list of all drivers.
 */
export const listDrivers = () => {
  return API.get(process.env.REACT_APP_DRIVERS);
};

/**
 * Retrieve a specific driver by id.
 * @param {string} id - Driver's MongoDB _id.
 */
export const getDriver = (id) => {
  return API.get(`${process.env.REACT_APP_DRIVERS}/${id}`);
};

/**
 * Create a new driver.
 * @param {Object} data - Driver fields.
 */
export const addDriver = (data) => {
  return API.post(process.env.REACT_APP_DRIVERS, data);
};

/**
 * Update an existing driver record.
 * @param {string} id - Driver's MongoDB _id.
 * @param {Object} data - Partial fields to update.
 */
export const updateDriver = (id, data) => {
  return API.put(`${process.env.REACT_APP_DRIVERS}/${id}`, data);
};

export default { listDrivers, getDriver, addDriver, updateDriver };