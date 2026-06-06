import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL 
  ?? 'http://localhost:8000/api';

const getAuthToken = () => {
  return import.meta.env.VITE_AUTH_TOKEN 
    ?? localStorage.getItem('auth_token')
    ?? 'dummy-token-for-hackathon';
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getAuthToken()}`;
  return config;
});

