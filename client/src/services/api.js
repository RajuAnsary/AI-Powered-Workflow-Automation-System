import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const uploadFile = (formData) =>
  api.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getRecords = (params) => api.get('/api/records', { params });

export const confirmRecord = (id, data) => api.put(`/api/records/${id}`, data);

export const updateRecord = (id, data) => api.put(`/api/records/${id}`, data);

export const deleteRecord = (id) => api.delete(`/api/records/${id}`);

export const confirmBatch = (rows) => api.post('/api/records/confirm-batch', { rows });

export const getDashboard = () => api.get('/api/dashboard');

export default api;
