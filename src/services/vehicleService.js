import API from './api';
import { pathWithId, resolvePath } from './endpointHelpers';

const VEHICLES_BASE = resolvePath(
  process.env.REACT_APP_VEHICLES,
  process.env.REACT_APP_VEHICLES_LIST,
  process.env.REACT_APP_VEHICLES_ADD,
  '/vehicles',
);
const VEHICLES_LIST = resolvePath(process.env.REACT_APP_VEHICLES_LIST, VEHICLES_BASE, '/vehicles');
const VEHICLES_ADD = resolvePath(process.env.REACT_APP_VEHICLES_ADD, VEHICLES_BASE, '/vehicles');
const VEHICLE_ID_TEMPLATE = `${VEHICLES_BASE || '/vehicles'}/:id`;

/**
 * Fetch all vehicles.
 */
export const listVehicles = () => {
  return API.get(VEHICLES_LIST || '/vehicles');
};

/**
 * Get a single vehicle by id.
 * @param {string} id - Vehicle document id.
 */
export const getVehicle = (id) => {
  return API.get(pathWithId(id, process.env.REACT_APP_VEHICLES_GET, process.env.REACT_APP_VEHICLES_UPDATE, VEHICLE_ID_TEMPLATE));
};

/**
 * Create a new vehicle. This call expects a FormData object because it may contain
 * a file upload for the annual inspection.
 * @param {FormData} formData - The form data containing vehicle fields and file.
 */
export const addVehicle = (formData) => {
  return API.post(VEHICLES_ADD || '/vehicles', formData, {
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
  return API.put(pathWithId(id, process.env.REACT_APP_VEHICLES_UPDATE, process.env.REACT_APP_VEHICLES_GET, VEHICLE_ID_TEMPLATE),
formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default { listVehicles, getVehicle, addVehicle, updateVehicle };
