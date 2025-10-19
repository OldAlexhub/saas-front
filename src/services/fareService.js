import API from './api';
import { resolvePath } from './endpointHelpers';

const FARE_BASE_PATH = resolvePath(process.env.REACT_APP_FARES_ADD, '/fares');
const FARE_ADD_PATH = resolvePath(process.env.REACT_APP_FARES_ADD, FARE_BASE_PATH, '/fares');
const FARE_UPDATE_PATH = resolvePath(process.env.REACT_APP_FARES_UPDATE, FARE_BASE_PATH, '/fares');
const FARE_GET_PATH = resolvePath(
  process.env.REACT_APP_FARES_GET,
  `${FARE_BASE_PATH || '/fares'}/current`,
  '/fares/current',
);
const FLAT_RATE_BASE = resolvePath(
  process.env.REACT_APP_FLAT_RATES_PATH,
  `${FARE_BASE_PATH || '/fares'}/flatrates`,
  '/fares/flatrates',
);

/**
 * Get the current fare configuration.
 */
export const getFare = () => {
  return API.get(FARE_GET_PATH || '/fares/current');
};

/**
 * Create the fare document. Only allowed once; will fail if it exists.
 * @param {Object} data - Contains farePerMile, extraPass, waitTimePerMinute.
 */
export const addFare = (data) => {
  return API.post(FARE_ADD_PATH || '/fares', data);
};

/**
 * Update the existing fare document.
 * @param {Object} data - Partial fields to update.
 */
export const updateFare = (data) => {
  return API.put(FARE_UPDATE_PATH || '/fares', data);
};

export const listFlatRates = () => {
  return API.get(FLAT_RATE_BASE || '/fares/flatrates');
};

export const createFlatRate = (data) => {
  return API.post(FLAT_RATE_BASE || '/fares/flatrates', data);
};

export const updateFlatRate = (id, data) => {
  return API.put(`${FLAT_RATE_BASE || '/fares/flatrates'}/${id}`, data);
};

export const deleteFlatRate = (id) => {
  return API.delete(`${FLAT_RATE_BASE || '/fares/flatrates'}/${id}`);
};

export default {
  getFare,
  addFare,
  updateFare,
  listFlatRates,
  createFlatRate,
  updateFlatRate,
  deleteFlatRate,
};
