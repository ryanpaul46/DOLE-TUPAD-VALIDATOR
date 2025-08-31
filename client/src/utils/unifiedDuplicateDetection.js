import Fuse from 'fuse.js';
import levenshtein from 'fast-levenshtein';
import stringSimilarity from 'string-similarity';
import { getDisplayName } from './nameUtils';
import { getUniformValue } from './dataUtils';

const normalizeName = (name) => {
  return name
    ?.toUpperCase()
    .replace(/[^A-Z\s]/g, '') // remove special chars
    .replace(/\s+/g, ' ') // normalize spaces
    .trim();
};

export const calculateUnifiedSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const normalized1 = normalizeName(str1);
  const normalized2 = normalizeName(str2);
  
  if (normalized1 === normalized2) return 100;
  if (normalized1.length === 0 || normalized2.length === 0) return 0;
  
  // String-similarity (Dice coefficient) - excellent for misspellings
  const diceScore = stringSimilarity.compareTwoStrings(normalized1, normalized2) * 100;
  
  // Levenshtein similarity - good for character substitutions
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const distance = levenshtein.get(normalized1, normalized2);
  const levenshteinScore = ((maxLength - distance) / maxLength) * 100;
  
  // Fuse.js similarity - good for partial matches
  const fuse = new Fuse([normalized2], { 
    threshold: 0.6, 
    includeScore: true,
    ignoreLocation: true,
    findAllMatches: true,
    minMatchCharLength: 1
  });
  const fuseResult = fuse.search(normalized1);
  const fuseScore = fuseResult.length > 0 ? (1 - fuseResult[0].score) * 100 : 0;
  
  // Misspelling detection bonuses
  let bonusScore = 0;
  
  // Bonus for same starting character (common in misspellings)
  if (normalized1[0] === normalized2[0]) {
    bonusScore += 5;
  }
  
  // Bonus for similar length (±1 character)
  if (Math.abs(normalized1.length - normalized2.length) <= 1) {
    bonusScore += 5;
  }
  
  // Bonus for short names with high similarity
  if (maxLength <= 6 && Math.max(diceScore, levenshteinScore) >= 50) {
    bonusScore += 15;
  }
  
  // Additional bonus for very similar names (common misspellings)
  if (Math.max(diceScore, levenshteinScore) >= 80) {
    bonusScore += 5;
  }
  
  // Weighted combination optimized for misspelling detection
  // 45% Dice + 35% Levenshtein + 10% Fuse + 10% bonus
  const unifiedScore = (diceScore * 0.45) + (levenshteinScore * 0.35) + (fuseScore * 0.1) + bonusScore;
  

  
  return Math.round(Math.min(unifiedScore, 100));
};

const calculateNameComponentSimilarity = (excelRow, dbRecord) => {
  const components = [
    { excel: 'First Name', db: 'first_name', weight: 0.4 },
    { excel: 'Middle Name', db: 'middle_name', weight: 0.2 },
    { excel: 'Last Name', db: 'last_name', weight: 0.4 }
  ];
  
  let totalScore = 0;
  let totalWeight = 0;
  let componentMatches = 0;
  
  components.forEach(({ excel, db, weight }) => {
    const excelValue = excelRow[excel]?.toString().trim() || '';
    const dbValue = dbRecord[db]?.toString().trim() || '';
    
    if (excelValue && dbValue) {
      const similarity = calculateUnifiedSimilarity(excelValue, dbValue);
      totalScore += similarity * weight;
      totalWeight += weight;
      
      // Count high-similarity components for bonus
      if (similarity >= 70) {
        componentMatches++;
      }
    }
  });
  
  let finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  // Bonus for multiple component matches (likely same person)
  if (componentMatches >= 2) {
    finalScore += 15;
  } else if (componentMatches >= 1) {
    finalScore += 5;
  }
  
  return Math.min(finalScore, 100);
};

// Optimized version using findBestMatch for better performance
export const findBestDuplicatesOptimized = (excelData, dbRecords, threshold = 60) => {
  if (!excelData?.length || !dbRecords?.length) return [];
  
  const duplicates = [];
  const dbNames = dbRecords.map(record => normalizeName(getDisplayName(record)));
  
  excelData.forEach((excelRow, excelIndex) => {
    const excelName = getUniformValue(excelRow, { key: 'name', excelKey: 'Name' }, true);
    if (!excelName) return;
    
    const normalizedExcel = normalizeName(excelName);
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(normalizedExcel, dbNames);
    
    if (bestMatch.rating * 100 >= threshold) {
      const dbRecord = dbRecords[bestMatchIndex];
      const dbName = getDisplayName(dbRecord);
      
      // Enhanced scoring with component analysis for the best match
      const componentSimilarity = calculateNameComponentSimilarity(excelRow, dbRecord);
      const finalScore = Math.max(bestMatch.rating * 100, componentSimilarity);
      
      duplicates.push({
        excel_row: {
          data: excelRow,
          row_number: excelIndex + 1
        },
        database_record: dbRecord,
        similarity_score: Math.round(finalScore),
        excel_name: excelName,
        db_name: dbName,
        component_scores: {
          first_name: calculateUnifiedSimilarity(
            excelRow['First Name']?.toString().trim() || '',
            dbRecord.first_name?.toString().trim() || ''
          ),
          middle_name: calculateUnifiedSimilarity(
            excelRow['Middle Name']?.toString().trim() || '',
            dbRecord.middle_name?.toString().trim() || ''
          ),
          last_name: calculateUnifiedSimilarity(
            excelRow['Last Name']?.toString().trim() || '',
            dbRecord.last_name?.toString().trim() || ''
          )
        }
      });
    }
  });
  
  return duplicates.sort((a, b) => b.similarity_score - a.similarity_score);
};

export const detectDuplicatesUnified = (excelData, dbRecords, threshold = 60) => {
  if (!excelData?.length || !dbRecords?.length) return [];
  
  // Use optimized version for better performance
  if (excelData.length > 100 || dbRecords.length > 500) {
    return findBestDuplicatesOptimized(excelData, dbRecords, threshold);
  }
  
  const duplicates = [];
  
  excelData.forEach((excelRow, excelIndex) => {
    const excelName = getUniformValue(excelRow, { key: 'name', excelKey: 'Name' }, true);
    if (!excelName) return;
    
    dbRecords.forEach((dbRecord) => {
      const dbName = getDisplayName(dbRecord);
      if (!dbName) return;
      
      // Calculate multiple similarity approaches
      const fullNameSimilarity = calculateUnifiedSimilarity(excelName, dbName);
      const componentSimilarity = calculateNameComponentSimilarity(excelRow, dbRecord);
      
      // Also try string-similarity on normalized full names for misspellings
      const normalizedExcel = normalizeName(excelName);
      const normalizedDb = normalizeName(dbName);
      const diceFullName = stringSimilarity.compareTwoStrings(normalizedExcel, normalizedDb) * 100;
      
      // Use the highest score from all approaches
      const similarity = Math.max(fullNameSimilarity, componentSimilarity, diceFullName);
      
      if (similarity >= threshold) {
        duplicates.push({
          excel_row: {
            data: excelRow,
            row_number: excelIndex + 1
          },
          database_record: dbRecord,
          similarity_score: Math.round(similarity),
          excel_name: excelName,
          db_name: dbName,
          component_scores: {
            first_name: calculateUnifiedSimilarity(
              excelRow['First Name']?.toString().trim() || '',
              dbRecord.first_name?.toString().trim() || ''
            ),
            middle_name: calculateUnifiedSimilarity(
              excelRow['Middle Name']?.toString().trim() || '',
              dbRecord.middle_name?.toString().trim() || ''
            ),
            last_name: calculateUnifiedSimilarity(
              excelRow['Last Name']?.toString().trim() || '',
              dbRecord.last_name?.toString().trim() || ''
            )
          }
        });
      }
    });
  });
  
  // Sort by similarity score (highest first)
  return duplicates.sort((a, b) => b.similarity_score - a.similarity_score);
};

export const createUnifiedFuseSearch = (duplicates) => {
  if (!duplicates?.length) return null;
  
  const searchData = duplicates.map((dup, idx) => ({
    id: idx,
    excel_name: dup.excel_name,
    db_name: dup.db_name,
    similarity_score: dup.similarity_score,
    duplicate: dup
  }));
  
  return new Fuse(searchData, {
    keys: [
      { name: 'excel_name', weight: 0.4 },
      { name: 'db_name', weight: 0.4 },
      { name: 'similarity_score', weight: 0.2 }
    ],
    threshold: 0.3,
    includeScore: true
  });
};

export const filterDuplicatesByUnifiedScore = (duplicates, minScore = 70) => {
  return duplicates.filter(dup => dup.similarity_score >= minScore);
};