import axios from "axios";

// Enhanced API configuration for local development
const getBaseURL = () => {
  // In development, use relative URLs (handled by Vite proxy)
  if (import.meta.env.DEV) {
    return "";
  }
  
  // In production, use environment variable or fallback
  return import.meta.env.VITE_API_URL || "https://dole-tupad-validator-1.onrender.com";
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // 10 second timeout for development
  headers: {
    'Content-Type': 'application/json',
  }
});

// Sanitize for logging
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

// Enhanced request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const csrfToken = localStorage.getItem("csrfToken");
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Handle multipart form data
    if (config.data instanceof FormData && csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Enhanced logging for development
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOGGING === 'true') {
      console.log(`🔄 API Request: ${sanitizeForLog(config.method?.toUpperCase())} ${sanitizeForLog(config.baseURL)}${sanitizeForLog(config.url)}`);
    }
    
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('❌ API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    // Enhanced logging for development
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOGGING === 'true') {
      console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (import.meta.env.DEV) {
      console.error('❌ API Response Error:', {
        status: error.response?.status,
        message: sanitizeForLog(error.response?.data?.message || error.message),
        url: sanitizeForLog(error.config?.url),
        method: sanitizeForLog(error.config?.method?.toUpperCase())
      });
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
