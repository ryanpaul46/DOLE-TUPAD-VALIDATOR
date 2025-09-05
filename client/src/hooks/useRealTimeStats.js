import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import websocketService from '../services/websocketService';

export const useRealTimeStats = (autoRefreshInterval = 30000) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchStatistics = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await api.get('/api/admin-statistics');
      setStatistics(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Statistics fetch error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const handleWebSocketUpdate = useCallback((data) => {
    setStatistics(data);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStatistics();

    // Setup WebSocket
    websocketService.connect();
    websocketService.on('statistics-update', handleWebSocketUpdate);

    // Setup auto-refresh interval
    if (autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchStatistics(false); // Silent refresh
      }, autoRefreshInterval);
    }

    return () => {
      websocketService.off('statistics-update', handleWebSocketUpdate);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStatistics, handleWebSocketUpdate, autoRefreshInterval]);

  const refreshStats = useCallback(() => {
    fetchStatistics(true);
    websocketService.requestStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    lastUpdated,
    refreshStats
  };
};