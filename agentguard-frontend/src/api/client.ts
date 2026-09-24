import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

/**
 * Retrieve the current session JWT from localStorage.
 * Note on security: Storing tokens in localStorage is acceptable for single-page portfolio/demo apps.
 * For an enterprise deployment, hardened httpOnly cookies set by a backend session endpoint
 * or Entra ID / MSAL tokens with silent refresh are strongly recommended to mitigate XSS exposure.
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_profile');
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If request is rejected with 401 Unauthorized and is not the login request itself
    if (error?.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/bootstrap')) {
        removeAuthToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
