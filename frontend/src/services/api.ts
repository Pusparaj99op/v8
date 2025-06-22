/*
 * API Service - Main API communication layer for Rescue.net AI
 * Handles all HTTP requests to the backend server
 * 
 * Created for Central India Hackathon 2.0
 */

import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // Patient registration
  registerPatient: (data: any) => api.post('/auth/patient/register', data),
  
  // Hospital registration
  registerHospital: (data: any) => api.post('/auth/hospital/register', data),
  
  // Patient login
  loginPatient: (data: any) => api.post('/auth/patient/login', data),
  
  // Hospital login
  loginHospital: (data: any) => api.post('/auth/hospital/login', data),
  
  // Get current user
  getMe: () => api.get('/auth/me'),
  
  // Change password
  changePassword: (data: any) => api.post('/auth/change-password', data),
  
  // Logout
  logout: () => api.post('/auth/logout'),
};

// Patient API functions
export const patientAPI = {
  // Get patient profile
  getProfile: () => api.get('/patients/profile'),
  
  // Update patient profile
  updateProfile: (data: any) => api.put('/patients/profile', data),
  
  // Get patient dashboard data
  getDashboard: () => api.get('/patients/dashboard'),
  
  // Get health stats
  getHealthStats: (period: string) => api.get(`/patients/health-stats?period=${period}`),
  
  // Add emergency contact
  addEmergencyContact: (data: any) => api.post('/patients/emergency-contacts', data),
  
  // Update preferences
  updatePreferences: (data: any) => api.put('/patients/preferences', data),
  
  // Get assigned medical team
  getMedicalTeam: () => api.get('/patients/medical-team'),
};

// Hospital API functions
export const hospitalAPI = {
  // Get hospital profile
  getProfile: () => api.get('/hospitals/profile'),
  
  // Update hospital profile
  updateProfile: (data: any) => api.put('/hospitals/profile', data),
  
  // Get hospital dashboard data
  getDashboard: () => api.get('/hospitals/dashboard'),
  
  // Get assigned patients
  getPatients: () => api.get('/hospitals/patients'),
  
  // Get patient details
  getPatientDetails: (patientId: string) => api.get(`/hospitals/patients/${patientId}`),
  
  // Add staff member
  addStaff: (data: any) => api.post('/hospitals/staff', data),
  
  // Update capacity
  updateCapacity: (data: any) => api.put('/hospitals/capacity', data),
  
  // Get analytics
  getAnalytics: (period: string) => api.get(`/hospitals/analytics?period=${period}`),
};

// Health Data API functions
export const healthDataAPI = {
  // Get health data for patient
  getHealthData: (patientId: string, params?: any) => 
    api.get(`/health-data/${patientId}`, { params }),
  
  // Get real-time health data
  getRealTimeData: (patientId: string) => 
    api.get(`/health-data/${patientId}/realtime`),
  
  // Get health statistics
  getStats: (patientId: string, period: string) => 
    api.get(`/health-data/${patientId}/stats`, { params: { period } }),
  
  // Export health data
  exportData: (patientId: string, format: string, startDate: string, endDate: string) =>
    api.get(`/health-data/${patientId}/export`, {
      params: { format, startDate, endDate },
      responseType: 'blob'
    }),
};

// Emergency API functions
export const emergencyAPI = {
  // Get emergency incidents
  getIncidents: (params?: any) => api.get('/emergency/incidents', { params }),
  
  // Get incident details
  getIncident: (incidentId: string) => api.get(`/emergency/incidents/${incidentId}`),
  
  // Update incident status
  updateIncidentStatus: (incidentId: string, status: string) =>
    api.patch(`/emergency/incidents/${incidentId}/status`, { status }),
  
  // Add incident response
  addResponse: (incidentId: string, data: any) =>
    api.post(`/emergency/incidents/${incidentId}/responses`, data),
  
  // Get emergency stats
  getStats: (period: string) => api.get(`/emergency/stats?period=${period}`),
};

// AI API functions
export const aiAPI = {
  // Get AI analysis
  getAnalysis: (patientId: string) => api.get(`/ai/analysis/${patientId}`),
  
  // Get health trends
  getTrends: (patientId: string, period: string) =>
    api.get(`/ai/trends/${patientId}`, { params: { period } }),
  
  // Get risk assessment
  getRiskAssessment: (patientId: string) => api.get(`/ai/risk/${patientId}`),
  
  // Get predictions
  getPredictions: (patientId: string) => api.get(`/ai/predictions/${patientId}`),
  
  // Get recommendations
  getRecommendations: (patientId: string) => api.get(`/ai/recommendations/${patientId}`),
};

export default api;
