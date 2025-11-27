// src/services/api/criminalApi.js
import axios from 'axios';

const BASE = 'http://localhost:5000/api/CriminalCase';

export const apiGetCases = (params = {}) =>
  axios.get(BASE, { params }).then(r => r.data);

export const apiGetCaseById = (id) =>
  axios.get(`${BASE}/${encodeURIComponent(id)}`).then(r => r.data);

export const apiSearchCases = (filters) =>
  axios.post(`${BASE}/search`, filters).then(r => r.data);

export const apiCreateCase = (payload) =>
  axios.post(BASE, payload).then(r => r.data);  // BÂY GIỜ SẼ CHẠY NGON!

export const apiUpdateCase = (id, payload) =>
  axios.put(`${BASE}/${encodeURIComponent(id)}`, payload).then(r => r.data);

export const apiDeleteCase = (id) =>
  axios.delete(`${BASE}/${encodeURIComponent(id)}`).then(r => r.data);

export const apiGetPersonHistory = (cccd) =>
  axios.get(`${BASE}/person/${encodeURIComponent(cccd)}`).then(r => r.data);

export const apiGetCaseGraph = (id) =>
  axios.get(`${BASE}/${encodeURIComponent(id)}/graph`).then(r => r.data);

export const apiGetHeatmap = () =>
  axios.get(`${BASE}/heatmap`).then(r => r.data);

export const apiGetPeopleInCase = (caseId) =>
  api.get(`/criminal/cases/${caseId}/people`);

export const getCriminalRecord = async (cccd) => {
  const response = await axios.get(`${API_URL}/citizen/criminal-record`, {
    params: { cccd: cccd.trim() }
  });
  return response.data;
};