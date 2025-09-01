import { calculateUnifiedSimilarity, detectDuplicatesUnified } from './unifiedDuplicateDetection.js';

// Test the similarity calculation
export const testSimilarity = () => {
  console.log('=== Testing Similarity Algorithm ===');
  
  // Test case: FLORIAD vs FLORIDA
  const test1 = calculateUnifiedSimilarity('FLORIAD', 'FLORIDA');
  console.log('FLORIAD vs FLORIDA:', test1 + '%');
  
  // Test case: Full names
  const test2 = calculateUnifiedSimilarity('FLORIAD GUTIERREZ AQUINO', 'FLORIDA GUTIERREZ AQUINO');
  console.log('FLORIAD GUTIERREZ AQUINO vs FLORIDA GUTIERREZ AQUINO:', test2 + '%');
  
  // Test case: Component matching
  const excelData = [{
    'First Name': 'FLORIAD',
    'Middle Name': 'GUTIERREZ', 
    'Last Name': 'AQUINO',
    'Name': 'FLORIAD GUTIERREZ AQUINO'
  }];
  
  const dbRecords = [{
    first_name: 'FLORIDA',
    middle_name: 'GUTIERREZ',
    last_name: 'AQUINO',
    name: 'FLORIDA GUTIERREZ AQUINO'
  }];
  
  const results = detectDuplicatesUnified(excelData, dbRecords, 60);
  console.log('Duplicate detection results:', results);
  
  return {
    singleName: test1,
    fullName: test2,
    duplicateResults: results
  };
};