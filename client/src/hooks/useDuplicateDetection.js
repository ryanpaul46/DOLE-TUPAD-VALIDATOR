import { useState, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { detectDuplicatesUnified, createUnifiedFuseSearch, filterDuplicatesByUnifiedScore } from '../utils/unifiedDuplicateDetection';

export const useDuplicateDetection = () => {
  // File comparison state
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

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState([]);
  const [filteredDuplicates, setFilteredDuplicates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(60);
  const [isProcessing, setIsProcessing] = useState(false);

  const fuseSearch = useMemo(() => {
    return createUnifiedFuseSearch(duplicates);
  }, [duplicates]);

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
      } else {
        result = res.data;
      }
      
      setCompareResult(result);
      setProgress({
        status: 'completed',
        processed: result.totalExcelRows,
        total: result.totalExcelRows,
        duplicatesFound: result.totalDuplicates,
        percentage: 100
      });
      
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

  const detectDuplicates = useCallback(async (excelData, dbRecords, threshold = 60) => {
    setIsProcessing(true);
    try {
      const detectedDuplicates = detectDuplicatesUnified(excelData, dbRecords, threshold);
      setDuplicates(detectedDuplicates);
      setFilteredDuplicates(detectedDuplicates);
      return detectedDuplicates;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const searchDuplicates = useCallback((term) => {
    setSearchTerm(term);
    
    if (!term.trim() || !fuseSearch) {
      const filtered = filterDuplicatesByUnifiedScore(duplicates, similarityThreshold);
      setFilteredDuplicates(filtered);
      return;
    }
    
    const results = fuseSearch.search(term);
    const searchResults = results
      .filter(result => result.item.similarity_score >= similarityThreshold)
      .map(result => result.item.duplicate);
    
    setFilteredDuplicates(searchResults);
  }, [fuseSearch, duplicates, similarityThreshold]);

  const updateThreshold = useCallback((threshold) => {
    setSimilarityThreshold(threshold);
    
    if (!searchTerm.trim()) {
      const filtered = filterDuplicatesByUnifiedScore(duplicates, threshold);
      setFilteredDuplicates(filtered);
    } else {
      searchDuplicates(searchTerm);
    }
  }, [duplicates, searchTerm, searchDuplicates]);

  const clearResults = useCallback(() => {
    setCompareResult(null);
    setError('');
    setProgress({
      status: 'idle',
      processed: 0,
      total: 0,
      duplicatesFound: 0,
      percentage: 0
    });
    setDuplicates([]);
    setFilteredDuplicates([]);
    setSearchTerm('');
    setSimilarityThreshold(60);
  }, []);

  return {
    // File comparison
    loading,
    error,
    compareResult,
    progress,
    compareFile,
    
    // Duplicate detection
    duplicates,
    filteredDuplicates,
    searchTerm,
    similarityThreshold,
    isProcessing,
    detectDuplicates,
    searchDuplicates,
    updateThreshold,
    
    // Shared
    clearResults
  };
};