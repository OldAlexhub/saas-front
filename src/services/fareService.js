import API from './api';

// Fare service functions to interact with the fare singleton document.

/**
 * Get the current fare configuration.
 */
export const getFare = () => {
  // The backend provides the current fare at /fares/current
  return API.get(`${process.env.REACT_APP_FARES}/current`);
};

/**
 * Create the fare document. Only allowed once; will fail if it exists.
 * @param {Object} data - Contains farePerMile, extraPass, waitTimePerMinute.
 */
export const addFare = (data) => {
  return API.post(process.env.REACT_APP_FARES, data);
};

/**
 * Update the existing fare document.
 * @param {Object} data - Partial fields to update.
 */
export const updateFare = (data) => {
  return API.put(process.env.REACT_APP_FARES, data);
};

export default { getFare, addFare, updateFare };