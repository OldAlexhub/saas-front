import axios from 'axios';

// Create an Axios instance with the base URL from the .env file.
// If the configured base URL contains `localhost` but the page is being
// accessed from another device (for example a phone), replace the
// hostname portion with the page's hostname so requests target the
// machine serving the frontend instead of the device's localhost.
function deriveBaseUrl() {
  let base = process.env.REACT_APP_API_BASE_URL || '/api';

  if (typeof window === 'undefined') return base;

  try {
    // If the base is a full URL and contains localhost, swap to the
    // current page hostname. This helps when you open the frontend on
    // a phone but the API env points to http://localhost:3001.
    const parsed = new URL(base, window.location.origin);
    if (
      parsed.hostname === 'localhost' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      parsed.hostname = window.location.hostname;
      // keep port if specified in parsed; if not, rely on the page origin
      base = parsed.toString().replace(/\/+$/, '');
    }
  } catch (e) {
    // If `base` is not a full URL (e.g. '/api'), the URL constructor will
    // still work thanks to the base argument above. In case of any error,
    // fall back to the original value.
  }

  return base;
}

const API = axios.create({
  baseURL: deriveBaseUrl(),
});

// Attach the JWT token to every request if it exists in localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
