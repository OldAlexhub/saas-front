import API from './api';
import { normalizeEndpoint, pathWithId, resolvePath } from './endpointHelpers';

const DRIVER_LIST_PATH = resolvePath(process.env.REACT_APP_DRIVERS_LIST, '/drivers');
const DRIVER_ADD_PATH = resolvePath(
  process.env.REACT_APP_DRIVERS_ADD,
  DRIVER_LIST_PATH,
  '/drivers',
);
const DRIVER_ID_TEMPLATE = resolvePath(
  process.env.REACT_APP_DRIVERS_BY_ID,
  process.env.REACT_APP_DRIVERS_UPDATE,
  `${DRIVER_LIST_PATH || '/drivers'}/:id`,
  '/drivers/:id',
);
const DRIVER_APP_CREDENTIALS_TEMPLATE = resolvePath(
  process.env.REACT_APP_DRIVERS_SET_APP_CREDENTIALS,
  `${DRIVER_ID_TEMPLATE || '/drivers/:id'}/app-credentials`,
  `${DRIVER_LIST_PATH || '/drivers'}/:id/app-credentials`,
  '/drivers/:id/app-credentials',
);

const DRIVER_API_BASE_URL = normalizeEndpoint(process.env.REACT_APP_DRIVER_API_BASE_URL);

const withDriverBase = (path) => {
  if (!DRIVER_API_BASE_URL) return path;
  if (!path) return DRIVER_API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${DRIVER_API_BASE_URL}/${normalizedPath}`;
};

/**
 * Fetch a list of all drivers.
 */
export const listDrivers = () => {
  return API.get(withDriverBase(DRIVER_LIST_PATH || '/drivers'));
};

/**
 * Retrieve a specific driver by id.
 * @param {string} id - Driver's MongoDB _id.
 */
export const getDriver = (id) => {
  return API.get(
    withDriverBase(
      pathWithId(
        id,
        process.env.REACT_APP_DRIVERS_BY_ID,
        process.env.REACT_APP_DRIVERS_UPDATE,
        DRIVER_ID_TEMPLATE,
      ) || `/drivers/${id}`,
    ),
  );
};

/**
 * Create a new driver.
 * @param {Object} data - Driver fields.
 */
export const addDriver = (data) => {
  return API.post(withDriverBase(DRIVER_ADD_PATH || '/drivers'), data);
};

/**
 * Update an existing driver record.
 * @param {string} id - Driver's MongoDB _id.
 * @param {Object} data - Partial fields to update.
 */
export const updateDriver = (id, data) => {
  return API.put(
    withDriverBase(
      pathWithId(
        id,
        process.env.REACT_APP_DRIVERS_UPDATE,
        process.env.REACT_APP_DRIVERS_BY_ID,
        DRIVER_ID_TEMPLATE,
      ) || `/drivers/${id}`,
    ),
    data,
  );
};

/**
 * Update the driver mobile app credentials.
 * @param {string} id - Driver's MongoDB _id.
 * @param {Object} data - Credential fields.
 */
export const setAppCredentials = (id, data) => {
  return API.patch(
    withDriverBase(
      pathWithId(
        id,
        process.env.REACT_APP_DRIVERS_SET_APP_CREDENTIALS,
        DRIVER_APP_CREDENTIALS_TEMPLATE,
      ) || `/drivers/${id}/app-credentials`,
    ),
    data,
  );
};

export default { listDrivers, getDriver, addDriver, updateDriver, setAppCredentials };
