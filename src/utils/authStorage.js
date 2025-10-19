const ADMIN_TOKEN_KEY = process.env.REACT_APP_TOKEN_KEY || 'token';
const DRIVER_TOKEN_KEY = process.env.REACT_APP_DRIVER_TOKEN_KEY || 'driver_token';

export const getAdminToken = () => {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const setAdminToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch (error) {
    // Storage might be unavailable (e.g., privacy mode)
  }
};

export const clearAdminToken = () => {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (error) {
    // Ignore storage errors
  }
};

export const getDriverToken = () => {
  try {
    return localStorage.getItem(DRIVER_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const setDriverToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(DRIVER_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(DRIVER_TOKEN_KEY);
    }
  } catch (error) {
    // Ignore storage errors
  }
};

export const clearDriverToken = () => {
  try {
    localStorage.removeItem(DRIVER_TOKEN_KEY);
  } catch (error) {
    // Ignore storage errors
  }
};

export { ADMIN_TOKEN_KEY, DRIVER_TOKEN_KEY };
