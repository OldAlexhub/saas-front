// Auth state is now managed via HttpOnly cookies (server-side).
// localStorage only holds a non-sensitive "isLoggedIn" flag used for
// client-side routing decisions. The actual JWT never touches localStorage.

const ADMIN_LOGGED_IN_KEY = 'isLoggedIn';
const DRIVER_TOKEN_KEY = process.env.REACT_APP_DRIVER_TOKEN_KEY || 'driver_token';

export const isAdminLoggedIn = () => {
  try {
    return localStorage.getItem(ADMIN_LOGGED_IN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAdminLoggedIn = () => {
  try {
    localStorage.setItem(ADMIN_LOGGED_IN_KEY, 'true');
  } catch {
    // Storage might be unavailable (e.g., privacy mode)
  }
};

export const clearAdminSession = () => {
  try {
    localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
  } catch {
    // Ignore storage errors
  }
};

export const getDriverToken = () => {
  try {
    return localStorage.getItem(DRIVER_TOKEN_KEY);
  } catch {
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
  } catch {
    // Ignore storage errors
  }
};

export const clearDriverToken = () => {
  try {
    localStorage.removeItem(DRIVER_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
};

export { DRIVER_TOKEN_KEY };
