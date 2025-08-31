import Fuse from 'fuse.js';
import levenshtein from 'fast-levenshtein';

export const calculateLevenshteinSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  
  const distance = levenshtein.get(str1.toLowerCase(), str2.toLowerCase());
  return Math.round(((maxLength - distance) / maxLength) * 100);
};

export const createEnhancedFuseSearch = (duplicates, getDisplayName, getUniformValue) => {
  if (!duplicates?.length) return null;
  
  const searchData = duplicates.map((dup, idx) => {
    const dbName = getDisplayName(dup.database_record);
    const excelName = getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true);
    
    return {
      id: idx,
      dbName,
      excelName,
      duplicate: dup,
      levenshteinScore: calculateLevenshteinSimilarity(dbName, excelName)
    };
  });
  
  return new Fuse(searchData, {
    keys: [
      { name: 'dbName', weight: 0.4 },
      { name: 'excelName', weight: 0.4 },
      { name: 'levenshteinScore', weight: 0.2 }
    ],
    threshold: 0.4,
    includeScore: true,
    shouldSort: true
  });
};

export const filterDuplicatesByLevenshtein = (duplicates, minSimilarity = 70, getDisplayName, getUniformValue) => {
  if (!duplicates?.length) return [];
  
  return duplicates.filter(dup => {
    const dbName = getDisplayName(dup.database_record);
    const excelName = getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true);
    const similarity = calculateLevenshteinSimilarity(dbName, excelName);
    return similarity >= minSimilarity;
  });
};