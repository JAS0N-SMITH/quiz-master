import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Typed API methods
export const apiClient = {
  get: <T = any>(url: string, config?: any): Promise<T> => {
    return api.get<T>(url, config).then((response) => response.data);
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return api.post<T>(url, data, config).then((response) => response.data);
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return api.put<T>(url, data, config).then((response) => response.data);
  },
  delete: <T = any>(url: string, config?: any): Promise<T> => {
    return api.delete<T>(url, config).then((response) => response.data);
  },
};

export default api;
