import API from './api';
import { resolvePath } from './endpointHelpers';

const FARES_BASE = resolvePath(
  process.env.REACT_APP_FARES,
  process.env.REACT_APP_FARES_CREATE,
  process.env.REACT_APP_FARES_UPDATE,
  '/fares',
);
const FARE_CREATE = resolvePath(process.env.REACT_APP_FARES_CREATE, FARES_BASE, '/fares');
const FARE_UPDATE = resolvePath(process.env.REACT_APP_FARES_UPDATE, FARES_BASE, '/fares');
const FARE_CURRENT = resolvePath(
  process.env.REACT_APP_FARES_CURRENT,
  process.env.REACT_APP_FARE_CURRENT,
  `${FARES_BASE || '/fares'}/current`,
  '/fares/current',
);

/**
 * Get the current fare configuration.
 */
export const getFare = () => {
  return API.get(FARE_CURRENT || '/fares/current');
};

/**
 * Create the fare document. Only allowed once; will fail if it exists.
 * @param {Object} data - Contains farePerMile, extraPass, waitTimePerMinute.
 */
export const addFare = (data) => {
  return API.post(FARE_CREATE || '/fares', data);
};

/**
 * Update the existing fare document.
 * @param {Object} data - Partial fields to update.
 */
export const updateFare = (data) => {
  return API.put(FARE_UPDATE || '/fares', data);
};

export default { getFare, addFare, updateFare };
