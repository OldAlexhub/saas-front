import API from './api';

/**
 * Fetch income-per-driver aggregation from server.
 * Accepts query params: from (ISO date string), to (ISO date string), driverId, limit
 */
export const incomePerDriver = (params = {}) => {
  return API.get('/reports/income-per-driver', { params });
};

export default { incomePerDriver };
