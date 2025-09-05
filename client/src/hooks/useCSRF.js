import { useState, useEffect } from 'react';
import api from '../api/axios';

export const useCSRF = () => {
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCSRFToken = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/csrf-token');
      const token = response.data.csrfToken;
      setCsrfToken(token);
      localStorage.setItem('csrfToken', token);
      return token;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshCSRFToken = async () => {
    return await fetchCSRFToken();
  };

  useEffect(() => {
    // Get token from localStorage or fetch new one
    const storedToken = localStorage.getItem('csrfToken');
    if (storedToken) {
      setCsrfToken(storedToken);
    } else {
      fetchCSRFToken();
    }
  }, []);

  return {
    csrfToken,
    loading,
    refreshCSRFToken,
    fetchCSRFToken
  };
};