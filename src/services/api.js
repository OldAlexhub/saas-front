import axios from 'axios';

// Create an Axios instance with the base URL from the .env file
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
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