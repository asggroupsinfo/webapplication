import axios from 'axios';
import type { LoginCredentials, Token, User, UserCreate, UserUpdate, Alert, AlertCreate, AlertUpdate, Symbol, CandleData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<Token> => {
    const response = await api.post('/auth/login-json', credentials);
    return response.data;
  },
};

// User API
export const userAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/users/');
    return response.data;
  },
  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await api.post('/users/', userData);
    return response.data;
  },
  updateUser: async (userId: string, userData: UserUpdate): Promise<User> => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },
};

// Alert API
export const alertAPI = {
  getAlerts: async (): Promise<Alert[]> => {
    const response = await api.get('/alerts/');
    return response.data;
  },
  createAlert: async (alertData: AlertCreate): Promise<Alert> => {
    const response = await api.post('/alerts/', alertData);
    return response.data;
  },
  updateAlert: async (alertId: string, alertData: AlertUpdate): Promise<Alert> => {
    const response = await api.put(`/alerts/${alertId}`, alertData);
    return response.data;
  },
  deleteAlert: async (alertId: string): Promise<void> => {
    await api.delete(`/alerts/${alertId}`);
  },
};

// Charts API
export const chartsAPI = {
  getSymbols: async (): Promise<{ symbols: string[] }> => {
    const response = await api.get('/charts/symbols');
    return response.data;
  },
  getHistoricalData: async (symbol: string, timeframe: string = 'M15', count: number = 100): Promise<{ symbol: string; timeframe: string; data: CandleData[] }> => {
    const response = await api.get(`/charts/history/${symbol}`, {
      params: { timeframe, count },
    });
    return response.data;
  },
};

export default api;

