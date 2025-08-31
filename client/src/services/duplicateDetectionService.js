import { detectDuplicatesUnified } from '../utils/unifiedDuplicateDetection';
import api from '../api/axios';

export class DuplicateDetectionService {
  static async scanFile(file, existingData, threshold = 60) {
    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const compareResponse = await api.post('/api/compare-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const excelData = compareResponse.data.originals?.map(orig => orig.data) || [];
      const existingDuplicates = compareResponse.data.duplicates || [];
      
      const allExcelData = [
        ...excelData,
        ...existingDuplicates.map(dup => dup.excel_row.data)
      ];
      
      const enhancedDuplicates = detectDuplicatesUnified(allExcelData, existingData, threshold);
      
      const duplicateExcelRows = new Set(enhancedDuplicates.map(dup => dup.excel_row.row_number));
      const newRecords = allExcelData.filter((_, index) => !duplicateExcelRows.has(index + 1));
      
      return {
        duplicates: enhancedDuplicates,
        newRecords: newRecords,
        totalExcelRows: allExcelData.length,
        totalDuplicates: enhancedDuplicates.length,
        totalNewRecords: newRecords.length
      };
    } catch (error) {
      throw new Error(`Duplicate detection failed: ${error.message}`);
    }
  }

  static async uploadNewRecords(records) {
    return await api.post('/api/upload-new-records', { newRecords: records });
  }

  static async uploadSelectedDuplicates(duplicates, remarks) {
    const selectedRecords = duplicates.map(dup => ({
      ...dup.excel_row.data,
      remarks: `${remarks} (Similarity: ${dup.similarity_score}%)`
    }));
    
    return await api.post('/api/upload-new-records', { newRecords: selectedRecords });
  }
}