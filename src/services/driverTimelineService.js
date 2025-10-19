import API from './api';

export const listDriverLocationTimeline = (params = {}) => {
  return API.get('/drivers/location-timeline', { params });
};

export default {
  listDriverLocationTimeline,
};
