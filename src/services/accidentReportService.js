import API from './api';

export const listAccidentReports = (params = {}) =>
  API.get('/accident-reports', { params });

export const getAccidentReport = (id) =>
  API.get(`/accident-reports/${id}`);

export const createAccidentReport = (data) =>
  API.post('/accident-reports', data);

export const updateAccidentReport = (id, data) =>
  API.patch(`/accident-reports/${id}`, data);

export const listDriversForAccident = () =>
  API.get('/accident-reports/drivers');

export const listVehiclesForAccident = () =>
  API.get('/accident-reports/vehicles');
