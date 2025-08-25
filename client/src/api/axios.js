// src/api/axios.js
import axios from "axios";

// Determine API base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "/api"  // When serving frontend from backend in production
    : "http://localhost:4000/api");  // Development URL

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Always attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
