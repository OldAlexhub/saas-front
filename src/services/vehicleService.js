import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const VEHICLE_LIST_PATH = resolvePath(process.env.REACT_APP_VEHICLES_LIST, '/vehicles');
const VEHICLE_ADD_PATH = resolvePath(
  process.env.REACT_APP_VEHICLES_ADD,
  VEHICLE_LIST_PATH,
  '/vehicles',
);
const VEHICLE_ID_TEMPLATE = resolvePath(
  process.env.REACT_APP_VEHICLES_BY_ID,
  process.env.REACT_APP_VEHICLES_UPDATE,
  `${VEHICLE_LIST_PATH || '/vehicles'}/:id`,
  '/vehicles/:id',
);

/**
 * Fetch all vehicles.
 */
export const listVehicles = () => {
  return API.get(VEHICLE_LIST_PATH || '/vehicles');
};

/**
 * Get a single vehicle by id.
 * @param {string} id - Vehicle document id.
 */
export const getVehicle = (id) => {
  return API.get(
      pathWithId(
        id,
        process.env.REACT_APP_VEHICLES_BY_ID,
        process.env.REACT_APP_VEHICLES_UPDATE,
        VEHICLE_ID_TEMPLATE,
      ) || `/vehicles/${id}`,
  );
};

/**
 * Create a new vehicle. This call expects a FormData object because it may contain
 * a file upload for the annual inspection.
 * @param {FormData} formData - The form data containing vehicle fields and file.
 */
export const addVehicle = (formData) => {
  return API.post(VEHICLE_ADD_PATH || '/vehicles', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Update an existing vehicle. This call may also include a new file, so it uses
 * multipart/form-data when formData includes a File object.
 * @param {string} id - Vehicle document id.
 * @param {FormData} formData - The updated fields as FormData.
 */
export const updateVehicle = (id, formData) => {
  return API.put(
      pathWithId(
        id,
        process.env.REACT_APP_VEHICLES_UPDATE,
        process.env.REACT_APP_VEHICLES_BY_ID,
        VEHICLE_ID_TEMPLATE,
      ) || `/vehicles/${id}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
};

export default { listVehicles, getVehicle, addVehicle, updateVehicle };
