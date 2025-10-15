import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const DRIVERS_BASE = resolvePath(
  process.env.REACT_APP_DRIVERS,
  process.env.REACT_APP_DRIVERS_LIST,
  process.env.REACT_APP_DRIVERS_ADD,
  '/drivers',
);
const DRIVERS_LIST = resolvePath(process.env.REACT_APP_DRIVERS_LIST, DRIVERS_BASE, '/drivers');
const DRIVERS_ADD = resolvePath(process.env.REACT_APP_DRIVERS_ADD, DRIVERS_BASE, '/drivers');
const DRIVER_ID_TEMPLATE = `${DRIVERS_BASE || '/drivers'}/:id`;

/**
 * Fetch a list of all drivers.
 */
export const listDrivers = () => {
  return API.get(DRIVERS_LIST || '/drivers');
};

/**
 * Retrieve a specific driver by id.
 * @param {string} id - Driver's MongoDB _id.
 */
export const getDriver = (id) => {
  return API.get(pathWithId(id, process.env.REACT_APP_DRIVERS_GET, process.env.REACT_APP_DRIVERS_UPDATE, DRIVER_ID_TEMPLATE));
};

/**
 * Create a new driver.
 * @param {Object} data - Driver fields.
 */
export const addDriver = (data) => {
  return API.post(DRIVERS_ADD || '/drivers', data);
};

/**
 * Update an existing driver record.
 * @param {string} id - Driver's MongoDB _id.
 * @param {Object} data - Partial fields to update.
 */
export const updateDriver = (id, data) => {
  return API.put(pathWithId(id, process.env.REACT_APP_DRIVERS_UPDATE, process.env.REACT_APP_DRIVERS_GET, DRIVER_ID_TEMPLATE), data);
};

export default { listDrivers, getDriver, addDriver, updateDriver };
