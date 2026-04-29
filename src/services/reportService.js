import API from './api';

export const runOperationalReport = (reportType, params = {}) => {
  return API.get(`/reports/${reportType}`, { params });
};

/**
 * Fetch income-per-driver aggregation from server.
 * Accepts query params: from (ISO date string), to (ISO date string), driverId, limit
 */
export const incomePerDriver = (params = {}) => {
  return API.get('/reports/income-per-driver', { params });
};

export default { incomePerDriver, runOperationalReport };
