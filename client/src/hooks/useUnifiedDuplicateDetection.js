import { useState, useCallback, useMemo } from 'react';
import { detectDuplicatesUnified, createUnifiedFuseSearch, filterDuplicatesByUnifiedScore } from '../utils/unifiedDuplicateDetection';

export const useUnifiedDuplicateDetection = () => {
  const [duplicates, setDuplicates] = useState([]);
  const [filteredDuplicates, setFilteredDuplicates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);

  const fuseSearch = useMemo(() => {
    return createUnifiedFuseSearch(duplicates);
  }, [duplicates]);

  const detectDuplicates = useCallback(async (excelData, dbRecords, threshold = 70) => {
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
    setDuplicates([]);
    setFilteredDuplicates([]);
    setSearchTerm('');
    setSimilarityThreshold(70);
  }, []);

  return {
    duplicates,
    filteredDuplicates,
    searchTerm,
    similarityThreshold,
    isProcessing,
    detectDuplicates,
    searchDuplicates,
    updateThreshold,
    clearResults
  };
};