import API from './api';

// Vehicle service encapsulates API interactions for vehicle resources.

/**
 * Fetch all vehicles.
 */
export const listVehicles = () => {
  return API.get(process.env.REACT_APP_VEHICLES);
};

/**
 * Get a single vehicle by id.
 * @param {string} id - Vehicle document id.
 */
export const getVehicle = (id) => {
  return API.get(`${process.env.REACT_APP_VEHICLES}/${id}`);
};

/**
 * Create a new vehicle. This call expects a FormData object because it may contain
 * a file upload for the annual inspection.
 * @param {FormData} formData - The form data containing vehicle fields and file.
 */
export const addVehicle = (formData) => {
  return API.post(process.env.REACT_APP_VEHICLES, formData, {
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
  return API.put(`${process.env.REACT_APP_VEHICLES}/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default { listVehicles, getVehicle, addVehicle, updateVehicle };