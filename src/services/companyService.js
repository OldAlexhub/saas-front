import API from './api';

export const getCompanyProfile = () => {
  return API.get('/company/profile');
};

export const updateCompanyProfile = (data) => {
  return API.put('/company/profile', data);
};

export default {
  getCompanyProfile,
  updateCompanyProfile,
};
