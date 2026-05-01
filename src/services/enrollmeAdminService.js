import API from './api';

export const listEnrollmeAdmins = () => API.get('/enrollme-admins');
export const createEnrollmeAdmin = (data) => API.post('/enrollme-admins', data);
export const updateEnrollmeAdmin = (id, data) => API.patch(`/enrollme-admins/${id}`, data);
export const deleteEnrollmeAdmin = (id) => API.delete(`/enrollme-admins/${id}`);
