import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const ACTIVE_LIST_PATH = resolvePath(process.env.REACT_APP_ACTIVES_LIST, '/actives');
const ACTIVE_ADD_PATH = resolvePath(
  process.env.REACT_APP_ACTIVES_ADD,
  ACTIVE_LIST_PATH,
  '/actives',
);
const ACTIVE_ID_TEMPLATE = resolvePath(
  process.env.REACT_APP_ACTIVES_GET,
  process.env.REACT_APP_ACTIVES_UPDATE,
  `${ACTIVE_LIST_PATH || '/actives'}/:id`,
  '/actives/:id',
);
const ACTIVE_STATUS_TEMPLATE = resolvePath(
  process.env.REACT_APP_ACTIVES_STATUS,
  `${ACTIVE_ID_TEMPLATE || '/actives/:id'}/status`,
  `${ACTIVE_LIST_PATH || '/actives'}/:id/status`,
  '/actives/:id/status',
);
const ACTIVE_AVAILABILITY_TEMPLATE = resolvePath(
  process.env.REACT_APP_ACTIVES_AVAILABILITY,
  `${ACTIVE_ID_TEMPLATE || '/actives/:id'}/availability`,
  `${ACTIVE_LIST_PATH || '/actives'}/:id/availability`,
  '/actives/:id/availability',
);

/**
 * List active drivers with optional filters.
 * @param {Object} params - Query parameters like status, availability, lat, lng, radius.
 */
export const listActives = (params = {}) => {
  return API.get(ACTIVE_LIST_PATH || '/actives', { params });
};

/**
 * Fetch a single active record by id.
 * @param {string} id - Active document id.
 */
export const getActive = (id) => {
  return API.get(
      pathWithId(
        id,
        process.env.REACT_APP_ACTIVES_GET,
        process.env.REACT_APP_ACTIVES_UPDATE,
        ACTIVE_ID_TEMPLATE,
      ) || `/actives/${id}`,
  );
};

/**
 * Create a new active record.
 * @param {Object} data - Active fields.
 */
export const addActive = (data) => {
  return API.post(ACTIVE_ADD_PATH || '/actives', data);
};

/**
 * Update an existing active record.
 * @param {string} id - Active document id.
 * @param {Object} data - Fields to update.
 */
export const updateActive = (id, data) => {
  return API.put(
    pathWithId(
      id,
      process.env.REACT_APP_ACTIVES_UPDATE,
      process.env.REACT_APP_ACTIVES_GET,
      ACTIVE_ID_TEMPLATE,
    ) || `/actives/${id}`,
    data,
  );
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
    ) || `/actives/${id}/status`,
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
    ) || `/actives/${id}/availability`,
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
