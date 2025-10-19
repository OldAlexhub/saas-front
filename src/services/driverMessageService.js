import API from './api';

export const listDriverMessages = () => API.get('/messages');

export const createDriverMessage = (payload) => API.post('/messages', payload);

export const updateDriverMessage = (id, payload) => API.patch(`/messages/${id}`, payload);

export const deleteDriverMessage = (id) => API.delete(`/messages/${id}`);

export const sendDriverMessageNow = (payload) => API.post('/messages/send-now', payload);

export default {
  listDriverMessages,
  createDriverMessage,
  updateDriverMessage,
  deleteDriverMessage,
  sendDriverMessageNow,
};
