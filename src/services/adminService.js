import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const ADMINS_BASE = resolvePath(
  process.env.REACT_APP_ADMIN_SIGNUP,
  process.env.REACT_APP_ADMIN_LIST,
  '/admins',
);
const ADMINS_LIST = resolvePath(process.env.REACT_APP_ADMIN_LIST, ADMINS_BASE, '/admins');
const ADMIN_APPROVAL_TEMPLATE = `${ADMINS_BASE || '/admins'}/:id/approval`;
const ADMIN_LOGIN = resolvePath(process.env.REACT_APP_ADMIN_LOGIN, '/admins/login');

/**
 * Fetch all admin users. This is primarily used by the approvals panel to
 * review pending accounts.
 */
export const listAdmins = () => {
  return API.get(ADMINS_LIST || '/admins');
};

/**
 * Sign up a new admin account.
 * @param {Object} data - An object containing company, firstName, lastName, email, password, confirmPassword and optional phone number.
 */
export const signup = (data) => {
  return API.post(resolvePath(process.env.REACT_APP_ADMIN_SIGNUP, '/admins'), data);
};

/**
 * Log in an existing admin user.
 * @param {Object} data - An object containing email and password.
 */
export const login = (data) => {
  return API.post(ADMIN_LOGIN || '/admins/login', data);
};

/**
 * Update approval status for an admin.
 * @param {string} id - The admin's id.
 * @param {string} approved - Either "yes" or "no".
 */
export const updateApproval = (id, approved) => {
  const url = pathWithId(id, process.env.REACT_APP_ADMIN_APPROVAL, ADMIN_APPROVAL_TEMPLATE);
  return API.put(url || `${ADMINS_BASE || '/admins'}/${id}/approval`, { approved });
};

export default { listAdmins, signup, login, updateApproval };
