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

// Prevent infinite loops in interceptors
api.defaults.retry = false;

// Sanitize for logging
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

// Enhanced request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Get CSRF token for state-changing requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      let csrfToken = localStorage.getItem("csrfToken");
      
      // Get fresh CSRF token if we don't have one
      if (!csrfToken && config.url !== '/api/csrf-token') {
        try {
          const csrfResponse = await api.get('/api/csrf-token');
          csrfToken = csrfResponse.data.csrfToken;
          localStorage.setItem('csrfToken', csrfToken);
        } catch (error) {
          console.error('Failed to get CSRF token:', error);
        }
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
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
  async (error) => {
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
      localStorage.removeItem("csrfToken");
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle CSRF token errors
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('CSRF')) {
      try {
        // Get new CSRF token
        const csrfResponse = await api.get('/api/csrf-token');
        const newToken = csrfResponse.data.csrfToken;
        localStorage.setItem('csrfToken', newToken);
        
        // Retry the original request with new token
        const originalRequest = error.config;
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return api.request(originalRequest);
      } catch (csrfError) {
        console.error('Failed to refresh CSRF token:', csrfError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
