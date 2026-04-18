import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sora_token');
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
      localStorage.removeItem('sora_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
