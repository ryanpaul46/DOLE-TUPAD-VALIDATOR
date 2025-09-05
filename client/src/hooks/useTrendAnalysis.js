import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { subDays, subMonths, format, startOfDay, endOfDay } from 'date-fns';

export const useTrendAnalysis = (dataType = 'beneficiaries', timeRange = '30d') => {
  const [trendData, setTrendData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateDateRange = useCallback((range) => {
    const end = new Date();
    let start;
    let interval = 'day';

    switch (range) {
      case '7d':
        start = subDays(end, 7);
        interval = 'day';
        break;
      case '30d':
        start = subDays(end, 30);
        interval = 'day';
        break;
      case '90d':
        start = subDays(end, 90);
        interval = 'week';
        break;
      case '1y':
        start = subDays(end, 365);
        interval = 'month';
        break;
      default:
        start = subDays(end, 30);
        interval = 'day';
    }

    return { start, end, interval };
  }, []);

  const fetchTrendData = useCallback(async (type, range) => {
    setLoading(true);
    setError('');

    try {
      const { start, end, interval } = generateDateRange(range);
      
      const response = await api.get('/api/trend-analysis', {
        params: {
          type,
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
          interval
        }
      });

      setTrendData(response.data.trend || []);
      setHistoricalData(response.data.historical || []);
    } catch (err) {
      setError('Failed to fetch trend data');
      console.error('Trend analysis error:', err);
      
      // Generate mock data for development
      const mockData = generateMockTrendData(type, range);
      setTrendData(mockData.trend);
      setHistoricalData(mockData.historical);
    } finally {
      setLoading(false);
    }
  }, [generateDateRange]);

  const generateMockTrendData = (type, range) => {
    const { start, end } = generateDateRange(range);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const trend = [];
    const historical = [];
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      const baseValue = type === 'beneficiaries' ? 1000 : type === 'users' ? 50 : 100;
      const randomVariation = Math.random() * 0.3 - 0.15; // ±15% variation
      const trendFactor = 1 + (i / days) * 0.2; // 20% growth over period
      
      const value = Math.round(baseValue * trendFactor * (1 + randomVariation));
      
      trend.push({
        date: format(date, 'yyyy-MM-dd'),
        timestamp: date.toISOString(),
        count: value,
        value: value
      });
      
      // Historical data (previous period)
      const historicalDate = new Date(date);
      historicalDate.setDate(historicalDate.getDate() - days);
      
      const historicalValue = Math.round(baseValue * 0.8 * (1 + randomVariation));
      
      historical.push({
        date: format(historicalDate, 'yyyy-MM-dd'),
        timestamp: historicalDate.toISOString(),
        count: historicalValue,
        value: historicalValue
      });
    }
    
    return { trend, historical };
  };

  const calculateGrowthRate = useCallback((current, previous) => {
    if (!current || !previous || previous.length === 0) return null;
    
    const currentTotal = current.reduce((sum, item) => sum + (item.count || item.value), 0);
    const previousTotal = previous.reduce((sum, item) => sum + (item.count || item.value), 0);
    
    if (previousTotal === 0) return null;
    
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, []);

  const getInsights = useCallback(() => {
    if (!trendData || trendData.length < 2) return [];
    
    const insights = [];
    const growthRate = calculateGrowthRate(trendData, historicalData);
    
    if (growthRate !== null) {
      insights.push({
        type: growthRate > 0 ? 'positive' : 'negative',
        title: `${Math.abs(growthRate).toFixed(1)}% ${growthRate > 0 ? 'Growth' : 'Decline'}`,
        description: `Compared to previous period`
      });
    }
    
    // Peak detection
    const values = trendData.map(item => item.count || item.value);
    const maxValue = Math.max(...values);
    const maxIndex = values.indexOf(maxValue);
    const peakDate = trendData[maxIndex]?.date;
    
    if (peakDate) {
      insights.push({
        type: 'info',
        title: 'Peak Activity',
        description: `Highest value (${maxValue.toLocaleString()}) on ${format(new Date(peakDate), 'MMM dd')}`
      });
    }
    
    // Trend direction
    const recentTrend = values.slice(-7);
    const isIncreasing = recentTrend[recentTrend.length - 1] > recentTrend[0];
    
    insights.push({
      type: isIncreasing ? 'positive' : 'warning',
      title: `${isIncreasing ? 'Upward' : 'Downward'} Trend`,
      description: `Recent 7-day trend is ${isIncreasing ? 'increasing' : 'decreasing'}`
    });
    
    return insights;
  }, [trendData, historicalData, calculateGrowthRate]);

  useEffect(() => {
    fetchTrendData(dataType, timeRange);
  }, [dataType, timeRange, fetchTrendData]);

  return {
    trendData,
    historicalData,
    loading,
    error,
    insights: getInsights(),
    growthRate: calculateGrowthRate(trendData, historicalData),
    refetch: () => fetchTrendData(dataType, timeRange)
  };
};