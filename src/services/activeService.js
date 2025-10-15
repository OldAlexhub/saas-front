import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const ACTIVES_BASE = resolvePath(
  process.env.REACT_APP_ACTIVES,
  process.env.REACT_APP_ACTIVES_LIST,
  process.env.REACT_APP_ACTIVES_ADD,
  '/actives',
);
const ACTIVES_LIST = resolvePath(process.env.REACT_APP_ACTIVES_LIST, ACTIVES_BASE, '/actives');
const ACTIVES_ADD = resolvePath(process.env.REACT_APP_ACTIVES_ADD, ACTIVES_BASE, '/actives');
const ACTIVE_ID_TEMPLATE = `${ACTIVES_BASE || '/actives'}/:id`;
const ACTIVE_STATUS_TEMPLATE = `${ACTIVE_ID_TEMPLATE}/status`;
const ACTIVE_AVAILABILITY_TEMPLATE = `${ACTIVE_ID_TEMPLATE}/availability`;

/**
 * List active drivers with optional filters.
 * @param {Object} params - Query parameters like status, availability, lat, lng, radius.
 */
export const listActives = (params = {}) => {
  return API.get(ACTIVES_LIST || '/actives', { params });
};

/**
 * Fetch a single active record by id.
 * @param {string} id - Active document id.
 */
export const getActive = (id) => {
  return API.get(pathWithId(id, process.env.REACT_APP_ACTIVES_GET, process.env.REACT_APP_ACTIVES_UPDATE, ACTIVE_ID_TEMPLATE));
};

/**
 * Create a new active record.
 * @param {Object} data - Active fields.
 */
export const addActive = (data) => {
  return API.post(ACTIVES_ADD || '/actives', data);
};

/**
 * Update an existing active record.
 * @param {string} id - Active document id.
 * @param {Object} data - Fields to update.
 */
export const updateActive = (id, data) => {
  return API.put(pathWithId(id, process.env.REACT_APP_ACTIVES_UPDATE, process.env.REACT_APP_ACTIVES_GET, ACTIVE_ID_TEMPLATE), data);
};

/**
 * Update the status (Active/Inactive) for an active record.
 * @param {string} id - Active document id.
 * @param {string} status - New status, "Active" or "Inactive".
 */
export const updateStatus = (id, status) => {
  return API.put(
    pathWithId(
      id,
      process.env.REACT_APP_ACTIVES_STATUS,
      ACTIVE_STATUS_TEMPLATE,
    ),
    { status },
  );
};

/**
 * Update the availability (Online/Offline) for an active record.
 * @param {string} id - Active document id.
 * @param {string} availability - New availability, "Online" or "Offline".
 */
export const updateAvailability = (id, availability) => {
  return API.put(
    pathWithId(
      id,
      process.env.REACT_APP_ACTIVES_AVAILABILITY,
      ACTIVE_AVAILABILITY_TEMPLATE,
    ),
    { availability },
  );
};

export default {
  listActives,
  getActive,
  addActive,
  updateActive,
  updateStatus,
  updateAvailability,
};
