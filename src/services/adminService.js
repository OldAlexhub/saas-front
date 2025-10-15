import API from './api';

// Admin service functions for interacting with the backend API.
// These functions wrap axios calls and return the resulting promises.

/**
 * Sign up a new admin account.
 * @param {Object} data - An object containing company, firstName, lastName, email, password, confirmPassword and optional phoneNumber.
 */
export const signup = (data) => {
  return API.post(process.env.REACT_APP_ADMIN_SIGNUP, data);
};

/**
 * Log in an existing admin user.
 * @param {Object} data - An object containing email and password.
 */
export const login = (data) => {
  return API.post(process.env.REACT_APP_ADMIN_LOGIN, data);
};

/**
 * Update approval status for an admin.
 * @param {string} id - The admin's id.
 * @param {string} approved - Either "yes" or "no".
 */
export const updateApproval = (id, approved) => {
  const url = process.env.REACT_APP_ADMIN_APPROVAL.replace(':id', id);
  return API.put(url, { approved });
};

export default { signup, login, updateApproval };