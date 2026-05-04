import axios from 'axios';
import { STORAGE_KEYS } from '../constants';

const apiClient = axios.create({
  baseURL: '/api',
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handler
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect during setup wizard — those endpoints are @Public
      const isSetupRoute = window.location.pathname.startsWith('/setup');
      const isSetupApi = error.config?.url?.startsWith('/setup/');
      if (!isSetupRoute && !isSetupApi) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
