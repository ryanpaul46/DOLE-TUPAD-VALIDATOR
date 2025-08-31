import { useState } from 'react';
import api from '../api/axios';

export const useFileComparison = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [progress, setProgress] = useState({ 
    status: 'idle', 
    processed: 0, 
    total: 0, 
    duplicatesFound: 0, 
    percentage: 0 
  });

  const compareFile = async (file) => {
    if (!file) {
      setError('Please select an Excel file');
      return null;
    }

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      setLoading(true);
      setError('');
      setProgress({
        status: 'processing',
        processed: 0,
        total: 0,
        duplicatesFound: 0,
        percentage: 0
      });
      
      const res = await api.post('/api/compare-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      let result;
      if (res.data.shouldUseOptimized) {
        setProgress(prev => ({
          ...prev,
          total: res.data.fileSize,
          status: 'processing'
        }));
        
        const optimizedRes = await api.post('/api/compare-excel-optimized', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        result = optimizedRes.data;
        setCompareResult(result);
        setProgress({
          status: 'completed',
          processed: result.totalExcelRows,
          total: result.totalExcelRows,
          duplicatesFound: result.totalDuplicates,
          percentage: 100
        });
      } else {
        result = res.data;
        setCompareResult(result);
        setProgress({
          status: 'completed',
          processed: result.totalExcelRows,
          total: result.totalExcelRows,
          duplicatesFound: result.totalDuplicates,
          percentage: 100
        });
      }
      return result;
    } catch (err) {
      console.error('Compare failed:', err);
      setError('Comparison failed. Please try again.');
      setProgress(prev => ({ ...prev, status: 'error' }));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setCompareResult(null);
    setError('');
    setProgress({
      status: 'idle',
      processed: 0,
      total: 0,
      duplicatesFound: 0,
      percentage: 0
    });
  };

  return {
    loading,
    error,
    compareResult,
    progress,
    compareFile,
    clearResults
  };
};