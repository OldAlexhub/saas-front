import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const ADMIN_BASE_PATH = resolvePath(process.env.REACT_APP_ADMIN_SIGNUP, '/admins');
const ADMIN_LIST_PATH = resolvePath(ADMIN_BASE_PATH, '/admins');
const ADMIN_LOGIN_PATH = resolvePath(process.env.REACT_APP_ADMIN_LOGIN, '/admins/login');
const ADMIN_APPROVAL_TEMPLATE = resolvePath(
  process.env.REACT_APP_ADMIN_APPROVAL,
  `${ADMIN_LIST_PATH || '/admins'}/:id/approval`,
  '/admins/:id/approval',
);

/**
 * Fetch all admin users. This is primarily used by the approvals panel to
 * review pending accounts.
 */
export const listAdmins = () => {
  return API.get(ADMIN_LIST_PATH || '/admins');
};

/**
 * Sign up a new admin account.
 * @param {Object} data - An object containing company, firstName, lastName, email, password, confirmPassword and optional phone number.
 */
export const signup = (data) => {
  return API.post(resolvePath(process.env.REACT_APP_ADMIN_SIGNUP, ADMIN_BASE_PATH || '/admins'), data);
};

/**
 * Log in an existing admin user.
 * @param {Object} data - An object containing email and password.
 */
export const login = (data) => {
  return API.post(ADMIN_LOGIN_PATH || '/admins/login', data);
};

/**
 * Update approval status for an admin.
 * @param {string} id - The admin's id.
 * @param {string} approved - Either "yes" or "no".
 */
export const updateApproval = (id, approved) => {
  const url =
    pathWithId(
      id,
      process.env.REACT_APP_ADMIN_APPROVAL,
      ADMIN_APPROVAL_TEMPLATE,
    ) || `${ADMIN_BASE_PATH || '/admins'}/${id}/approval`;
  return API.put(url, { approved });
};

export default { listAdmins, signup, login, updateApproval };
