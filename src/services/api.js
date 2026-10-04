import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sn_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sn_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const wearableApi = {
  connect: (data) => api.post('/wearables/connect', data),
  getWearable: (id) => api.get(`/wearables/${id}`),
  triggerSOS: (id, data) => api.post(`/wearables/${id}/sos`, data),
  sendEvent: (id, data) => api.post(`/wearables/${id}/event`, data),
  updateBattery: (id, data) => api.patch(`/wearables/${id}/battery`, data),
};

export const incidentApi = {
  getUserIncidents: () => api.get('/incidents'),
  getActiveIncident: () => api.get('/incidents/active'),
  getIncident: (id) => api.get(`/incidents/${id}`),
  getEvents: (id) => api.get(`/incidents/${id}/events`),
  cancel: (id) => api.post(`/incidents/${id}/cancel`),
  accept: (id) => api.post(`/incidents/${id}/accept`),
  markResponding: (id) => api.post(`/incidents/${id}/responding`),
  markArrived: (id) => api.post(`/incidents/${id}/arrived`),
  markHandoff: (id) => api.post(`/incidents/${id}/handoff`),
  resolve: (id) => api.post(`/incidents/${id}/resolve`),
};

export const zoneApi = {
  getNearby: (params) => api.get('/zones/nearby', { params }),
  getContext: (params) => api.get('/zones/context', { params }),
};

export const responderApi = {
  getNearby: (params) => api.get('/responders/nearby', { params }),
  getProfile: () => api.get('/responders/profile'),
  updateAvailability: (data) => api.patch('/responders/availability', data),
  getActiveIncidents: () => api.get('/responders/active-incidents'),
  getAvailableIncidents: () => api.get('/responders/available-incidents'),
  updateLocation: (data) => api.patch('/responders/location', data),
};

export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  updateEmergencyContacts: (data) => api.patch('/users/emergency-contacts', data),
};

export default api;
