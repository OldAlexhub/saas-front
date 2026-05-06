import API from './api';

// Agencies
export const listAgencies = (params) => API.get('/nemt/agencies', { params });
export const createAgency = (data) => API.post('/nemt/agencies', data);
export const getAgency = (id) => API.get(`/nemt/agencies/${id}`);
export const updateAgency = (id, data) => API.patch(`/nemt/agencies/${id}`, data);
export const deactivateAgency = (id) => API.delete(`/nemt/agencies/${id}`);

// Trips
export const listTrips = (params) => API.get('/nemt/trips', { params });
export const createTrip = (data) => API.post('/nemt/trips', data);
export const bulkCreateTrips = (data) => API.post('/nemt/trips/bulk', data);
export const importTrips = (formData) =>
  API.post('/nemt/trips/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getTrip = (id) => API.get(`/nemt/trips/${id}`);
export const updateTrip = (id, data) => API.patch(`/nemt/trips/${id}`, data);
export const cancelTrip = (id, data) => API.post(`/nemt/trips/${id}/cancel`, data);
export const markTripNoShow = (id, data) => API.post(`/nemt/trips/${id}/no-show`, data);

// Runs
export const listRuns = (params) => API.get('/nemt/runs', { params });
export const createRun = (data) => API.post('/nemt/runs', data);
export const getRun = (id) => API.get(`/nemt/runs/${id}`);
export const updateRun = (id, data) => API.patch(`/nemt/runs/${id}`, data);
export const reorderRun = (id, data) => API.patch(`/nemt/runs/${id}/reorder`, data);
export const addTripToRun = (id, data) => API.post(`/nemt/runs/${id}/trips`, data);
export const removeTripFromRun = (runId, tripId) =>
  API.delete(`/nemt/runs/${runId}/trips/${tripId}`);
export const optimizeRun = (id) => API.post(`/nemt/runs/${id}/optimize`);
export const dispatchRun = (id) => API.post(`/nemt/runs/${id}/dispatch`);
export const cancelRun = (id, data) => API.post(`/nemt/runs/${id}/cancel`, data);

// Settings
export const getNemtSettings = () => API.get('/nemt/settings');
export const updateNemtSettings = (data) => API.put('/nemt/settings', data);

// Agency billing
export const listBillingBatches = () => API.get('/nemt/billing/batches');
export const getBillingBatch = (id) => API.get(`/nemt/billing/batches/${id}`);
export const createBillingBatch = (data) => API.post('/nemt/billing/batches', data);
export const updateBillingBatch = (id, data) =>
  API.patch(`/nemt/billing/batches/${id}`, data);
export const getUnbilledTrips = (params) => API.get('/nemt/billing/unbilled', { params });

// Driver pay
export const listPayBatches = () => API.get('/nemt/pay/batches');
export const getPayBatch = (id) => API.get(`/nemt/pay/batches/${id}`);
export const createPayBatch = (data) => API.post('/nemt/pay/batches', data);
export const updatePayBatch = (id, data) => API.patch(`/nemt/pay/batches/${id}`, data);
export const getUnpaidTrips = (params) => API.get('/nemt/pay/unpaid', { params });

// Reports
export const getNemtOtpReport = (params) => API.get('/nemt/reports/otp', { params });
export const getNemtTripReport = (params) => API.get('/nemt/reports/trips', { params });
export const getNemtDriverActivityReport = (params) => API.get('/nemt/reports/driver-activity', { params });
export const getNemtAgencyBillingReport = (params) => API.get('/nemt/reports/agency-billing', { params });
export const getNemtRunsReport = (params) => API.get('/nemt/reports/runs', { params });
export const getNemtCancellationsReport = (params) => API.get('/nemt/reports/cancellations', { params });
export const getNemtLiveRuns = () => API.get('/nemt/reports/live-runs');
