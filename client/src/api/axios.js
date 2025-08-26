import axios from "axios";

// Use environment variable for API URL, fallback to deployed backend
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://dole-tupad-validator-1.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
