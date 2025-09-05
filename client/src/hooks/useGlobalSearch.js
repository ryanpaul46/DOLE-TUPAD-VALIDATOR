import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const useGlobalSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const searchBeneficiaries = useCallback(async (term = '', filterParams = {}, page = 1, limit = 50) => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        search: term,
        page,
        limit,
        ...filterParams
      };

      const response = await api.get('/api/search-beneficiaries', { params });
      
      setSearchResults(response.data.results || []);
      setTotalResults(response.data.total || 0);
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to search beneficiaries');
      console.error('Search error:', err);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    searchBeneficiaries(term, filters, 1);
  }, [filters, searchBeneficiaries]);

  const handleFilter = useCallback((newFilters) => {
    setFilters(newFilters);
    searchBeneficiaries(searchTerm, newFilters, 1);
  }, [searchTerm, searchBeneficiaries]);

  const handlePageChange = useCallback((page) => {
    searchBeneficiaries(searchTerm, filters, page);
  }, [searchTerm, filters, searchBeneficiaries]);

  const exportResults = useCallback(async (format = 'json') => {
    try {
      const params = {
        search: searchTerm,
        export: true,
        format,
        ...filters
      };

      const response = await api.get('/api/export-beneficiaries', { 
        params,
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        return response.data;
      } else {
        // Handle blob download
        const blob = new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `beneficiaries_export_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
      throw new Error('Failed to export data');
    }
  }, [searchTerm, filters]);

  // Initial load
  useEffect(() => {
    searchBeneficiaries('', {}, 1);
  }, [searchBeneficiaries]);

  return {
    searchResults,
    loading,
    error,
    totalResults,
    currentPage,
    filters,
    searchTerm,
    handleSearch,
    handleFilter,
    handlePageChange,
    exportResults,
    refresh: () => searchBeneficiaries(searchTerm, filters, currentPage)
  };
};