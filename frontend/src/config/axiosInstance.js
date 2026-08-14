import axios from 'axios';
import { getStoredAuthToken, clearAuthToken } from '../helpers/getAuthToken';

const getBackendURL = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:8080';
};

const axiosInstance = axios.create({
  baseURL: getBackendURL(),
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get' || method === 'head') {
    if (config.headers['Content-Type'] || config.headers['content-type']) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  } else if (!config.headers['Content-Type'] && !config.headers['content-type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['x-auth-token'] = token;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    if (
      status === 401 &&
      (code === 'NO_TOKEN' || code === 'INVALID_TOKEN' || code === 'USER_NOT_FOUND' || code === 'USER_INACTIVE')
    ) {
      clearAuthToken();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
