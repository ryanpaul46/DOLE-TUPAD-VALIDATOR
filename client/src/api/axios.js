// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://dole-tupad-validator.onrender.com/api" : "http://localhost:40000";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Always attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
