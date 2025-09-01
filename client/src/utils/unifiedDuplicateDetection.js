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

// Single character difference detection
const detectSingleCharDifference = (str1, str2) => {
  if (Math.abs(str1.length - str2.length) > 1) return false;
  
  let differences = 0;
  const minLength = Math.min(str1.length, str2.length);
  const maxLength = Math.max(str1.length, str2.length);
  
  // Count character differences
  for (let i = 0; i < minLength; i++) {
    if (str1[i] !== str2[i]) {
      differences++;
    }
  }
  
  // Add length difference
  differences += maxLength - minLength;
  
  return differences <= 1;
};

// Character position penalty calculation (reduced penalty)
const calculatePositionPenalty = (str1, str2) => {
  const minLength = Math.min(str1.length, str2.length);
  let positionErrors = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (str1[i] !== str2[i]) {
      positionErrors++;
    }
  }
  
  // Reduced penalty for position errors
  const positionPenalty = (positionErrors / minLength) * 10;
  return Math.min(positionPenalty, 10);
};

export const calculateUnifiedSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const normalized1 = normalizeName(str1);
  const normalized2 = normalizeName(str2);
  
  if (normalized1 === normalized2) return 100;
  if (normalized1.length === 0 || normalized2.length === 0) return 0;
  
  // Special handling for single character differences (like FLORIAD vs FLORIDA)
  const isSingleCharDiff = detectSingleCharDifference(normalized1, normalized2);
  if (isSingleCharDiff) {
    return 95; // Very high score for single character differences
  }
  
  // String-similarity (Dice coefficient) - increased weight for better detection
  const diceScore = stringSimilarity.compareTwoStrings(normalized1, normalized2) * 100;
  
  // Levenshtein similarity with reduced penalty
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const distance = levenshtein.get(normalized1, normalized2);
  let levenshteinScore = ((maxLength - distance) / maxLength) * 100;
  
  // Reduced penalty for multiple edits
  if (distance > 2) {
    levenshteinScore *= 0.9; // Only 10% penalty for multiple edits
  }
  
  // Character position penalty (reduced)
  const positionPenalty = calculatePositionPenalty(normalized1, normalized2);
  
  // Fuse.js similarity - good for partial matches
  const fuse = new Fuse([normalized2], { 
    threshold: 0.7, 
    includeScore: true,
    ignoreLocation: true,
    findAllMatches: true,
    minMatchCharLength: 1
  });
  const fuseResult = fuse.search(normalized1);
  const fuseScore = fuseResult.length > 0 ? (1 - fuseResult[0].score) * 100 : 0;
  
  // Enhanced misspelling detection bonuses
  let bonusScore = 0;
  
  // Bonus for same starting character (common in misspellings)
  if (normalized1[0] === normalized2[0]) {
    bonusScore += 5;
  }
  
  // Bonus for same ending character
  if (normalized1[normalized1.length - 1] === normalized2[normalized2.length - 1]) {
    bonusScore += 3;
  }
  
  // Bonus for similar length (±1 character)
  if (Math.abs(normalized1.length - normalized2.length) <= 1) {
    bonusScore += 5;
  }
  
  // Bonus for short names with high similarity
  if (maxLength <= 8 && Math.max(diceScore, levenshteinScore) >= 60) {
    bonusScore += 10;
  }
  
  // Bonus for very similar names (likely typos)
  if (diceScore >= 80 || levenshteinScore >= 80) {
    bonusScore += 8;
  }
  
  // Improved weighted combination: 40% Dice + 40% Levenshtein + 15% Fuse + 5% bonus - reduced penalty
  const unifiedScore = (diceScore * 0.40) + (levenshteinScore * 0.40) + (fuseScore * 0.15) + bonusScore - (positionPenalty * 0.5);
  
  return Math.round(Math.min(Math.max(unifiedScore, 0), 100));
};

// Component agreement requirement (relaxed for better detection)
const checkComponentAgreement = (excelRow, dbRecord) => {
  const firstNameSim = calculateUnifiedSimilarity(
    excelRow['First Name']?.toString().trim() || '',
    dbRecord.first_name?.toString().trim() || ''
  );
  const lastNameSim = calculateUnifiedSimilarity(
    excelRow['Last Name']?.toString().trim() || '',
    dbRecord.last_name?.toString().trim() || ''
  );
  
  // Relaxed requirement: at least one major component (first or last) to have 50%+ similarity
  return Math.max(firstNameSim, lastNameSim) >= 50;
};

const calculateNameComponentSimilarity = (excelRow, dbRecord) => {
  // Check component agreement first
  if (!checkComponentAgreement(excelRow, dbRecord)) {
    return 0; // Fail if no major component agreement
  }
  
  const components = [
    { excel: 'First Name', db: 'first_name', weight: 0.4 },
    { excel: 'Middle Name', db: 'middle_name', weight: 0.2 },
    { excel: 'Last Name', db: 'last_name', weight: 0.4 }
  ];
  
  let totalScore = 0;
  let totalWeight = 0;
  let componentMatches = 0;
  let componentScores = {};
  
  components.forEach(({ excel, db, weight }) => {
    const excelValue = excelRow[excel]?.toString().trim() || '';
    const dbValue = dbRecord[db]?.toString().trim() || '';
    
    if (excelValue && dbValue) {
      const similarity = calculateUnifiedSimilarity(excelValue, dbValue);
      componentScores[db] = similarity;
      totalScore += similarity * weight;
      totalWeight += weight;
      
      // Count high-similarity components for bonus
      if (similarity >= 70) {
        componentMatches++;
      }
    }
  });
  
  let finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  // Stricter bonus requirements
  if (componentMatches >= 2) {
    finalScore += 10;
  } else if (componentMatches >= 1) {
    finalScore += 3;
  }
  
  return { score: Math.min(finalScore, 100), componentScores };
};

// Optimized version using findBestMatch for better performance
export const findBestDuplicatesOptimized = (excelData, dbRecords, threshold = 60) => {
  if (!excelData?.length || !dbRecords?.length) return [];
  
  const results = [];
  const dbNames = dbRecords.map(record => normalizeName(getDisplayName(record)));
  
  excelData.forEach((excelRow, excelIndex) => {
    const excelName = getUniformValue(excelRow, { key: 'name', excelKey: 'Name' }, true);
    if (!excelName) return;
    
    const normalizedExcel = normalizeName(excelName);
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(normalizedExcel, dbNames);
    
    if (bestMatch.rating * 100 >= threshold) {
      const dbRecord = dbRecords[bestMatchIndex];
      const dbName = getDisplayName(dbRecord);
      
      // Check component agreement first
      const componentResult = calculateNameComponentSimilarity(excelRow, dbRecord);
      if (componentResult.score === 0) return; // Failed component agreement
      
      const finalScore = Math.max(bestMatch.rating * 100, componentResult.score);
      const matchType = classifyMatch(finalScore);
      const inReviewZone = finalScore >= THRESHOLDS.REVIEW_ZONE_LOW && finalScore < THRESHOLDS.DUPLICATE;
      
      results.push({
        excel_row: {
          data: excelRow,
          row_number: excelIndex + 1
        },
        database_record: dbRecord,
        similarity_score: Math.round(finalScore),
        match_type: matchType,
        in_review_zone: inReviewZone,
        requires_manual_review: inReviewZone,
        excel_name: excelName,
        db_name: dbName,
        component_scores: componentResult.componentScores || {
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
  
  return results.sort((a, b) => b.similarity_score - a.similarity_score);
};

// 3-tier classification system (adjusted thresholds)
export const classifyMatch = (similarity) => {
  if (similarity >= 80) return 'DUPLICATE';
  if (similarity >= 60) return 'POSSIBLE_MISMATCH';
  return 'NO_MATCH';
};

// Review zone thresholds (lowered for better detection)
export const THRESHOLDS = {
  DUPLICATE: 80,
  REVIEW_ZONE_HIGH: 70,
  REVIEW_ZONE_LOW: 60,
  NO_MATCH: 60
};

export const detectDuplicatesUnified = (excelData, dbRecords, threshold = 60) => {
  if (!excelData?.length || !dbRecords?.length) return [];
  
  // Use optimized version for better performance
  if (excelData.length > 100 || dbRecords.length > 500) {
    return findBestDuplicatesOptimized(excelData, dbRecords, threshold);
  }
  
  const results = [];
  
  excelData.forEach((excelRow, excelIndex) => {
    const excelName = getUniformValue(excelRow, { key: 'name', excelKey: 'Name' }, true);
    if (!excelName) return;
    
    dbRecords.forEach((dbRecord) => {
      const dbName = getDisplayName(dbRecord);
      if (!dbName) return;
      
      // Calculate component similarity with agreement check
      const componentResult = calculateNameComponentSimilarity(excelRow, dbRecord);
      if (componentResult.score === 0) return; // Failed component agreement
      
      // Calculate full name similarity
      const fullNameSimilarity = calculateUnifiedSimilarity(excelName, dbName);
      
      // Use the higher of component or full name similarity
      const similarity = Math.max(fullNameSimilarity, componentResult.score);
      
      if (similarity >= threshold) {
        const matchType = classifyMatch(similarity);
        const inReviewZone = similarity >= THRESHOLDS.REVIEW_ZONE_LOW && similarity < THRESHOLDS.DUPLICATE;
        
        results.push({
          excel_row: {
            data: excelRow,
            row_number: excelIndex + 1
          },
          database_record: dbRecord,
          similarity_score: Math.round(similarity),
          match_type: matchType,
          in_review_zone: inReviewZone,
          requires_manual_review: inReviewZone,
          excel_name: excelName,
          db_name: dbName,
          component_scores: componentResult.componentScores || {
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
  return results.sort((a, b) => b.similarity_score - a.similarity_score);
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

// Filter by match type
export const filterByMatchType = (results, matchType) => {
  return results.filter(result => result.match_type === matchType);
};

// Get items in review zone
export const getReviewZoneItems = (results) => {
  return results.filter(result => result.in_review_zone);
};

// Get statistics by match type
export const getMatchTypeStats = (results) => {
  const stats = {
    DUPLICATE: 0,
    POSSIBLE_MISMATCH: 0,
    NO_MATCH: 0,
    REVIEW_ZONE: 0
  };
  
  results.forEach(result => {
    stats[result.match_type]++;
    if (result.in_review_zone) {
      stats.REVIEW_ZONE++;
    }
  });
  
  return stats;
};