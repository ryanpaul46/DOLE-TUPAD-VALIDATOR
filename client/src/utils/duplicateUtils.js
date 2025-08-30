import stringSimilarity from "string-similarity";

// Constants
const MAX_LENGTH_DIFF = 2;
const MIN_NAME_LENGTH = 3;
const MISSPELLING_THRESHOLD = 0.3;
const MISSPELLING_SIMILARITY_BOOST = 75;
const MISSPELLING_BONUS = 10;

// Static uniform headers array
const UNIFORM_HEADERS = [
  { key: 'name', excelKey: 'Name', dbKey: 'name', label: 'Full Name' },
  { key: 'first_name', excelKey: 'First Name', dbKey: 'first_name', label: 'First Name' },
  { key: 'middle_name', excelKey: 'Middle Name', dbKey: 'middle_name', label: 'Middle Name' },
  { key: 'last_name', excelKey: 'Last Name', dbKey: 'last_name', label: 'Last Name' },
  { key: 'ext_name', excelKey: 'Ext. Name', dbKey: 'ext_name', label: 'Extension' },
  { key: 'project_series', excelKey: 'Project Series', dbKey: 'project_series', label: 'Project Series' },
  { key: 'id_number', excelKey: 'ID Number', dbKey: 'id_number', label: 'ID Number' },
  { key: 'birthdate', excelKey: 'Birthdate', dbKey: 'birthdate', label: 'Birthdate' },
  { key: 'barangay', excelKey: 'Barangay', dbKey: 'barangay', label: 'Barangay' },
  { key: 'city_municipality', excelKey: 'City Municipality', dbKey: 'city_municipality', label: 'City/Municipality' },
  { key: 'province', excelKey: 'Province', dbKey: 'province', label: 'Province' },
  { key: 'district', excelKey: 'District', dbKey: 'district', label: 'District' },
  { key: 'type_of_id', excelKey: 'Type of ID', dbKey: 'type_of_id', label: 'Type of ID' },
  { key: 'id_no', excelKey: 'ID No.', dbKey: 'id_no', label: 'ID No.' },
  { key: 'contact_no', excelKey: 'Contact No.', dbKey: 'contact_no', label: 'Contact No.' },
  { key: 'type_of_beneficiary', excelKey: 'Type of Beneficiary', dbKey: 'type_of_beneficiary', label: 'Beneficiary Type' },
  { key: 'occupation', excelKey: 'Occupation', dbKey: 'occupation', label: 'Occupation' },
  { key: 'sex', excelKey: 'Sex', dbKey: 'sex', label: 'Sex' },
  { key: 'civil_status', excelKey: 'Civil Status', dbKey: 'civil_status', label: 'Civil Status' },
  { key: 'age', excelKey: 'Age', dbKey: 'age', label: 'Age' },
  { key: 'dependent', excelKey: 'Dependent', dbKey: 'dependent', label: 'Dependent' }
];

// Helper to check if a value is valid
const isValidValue = (value) => {
  return value && String(value).trim() && !['null', 'undefined'].includes(String(value).trim());
};

// Helper function to concatenate full name from individual components
export const concatenateFullName = (record) => {
  if (!record) return '';
  
  const nameParts = [
    record.first_name,
    record.middle_name,
    record.last_name,
    record.ext_name
  ].filter(isValidValue);
  
  return nameParts.join(' ');
};

// Helper function to get display name (uses existing name or concatenated)
export const getDisplayName = (record) => {
  if (!record) return '';
  
  return isValidValue(record.name) ? record.name.trim() : concatenateFullName(record);
};

// Define uniform headers for comparison tables
export const getUniformHeaders = () => UNIFORM_HEADERS;

// Helper to get name value for Excel data
const getExcelNameValue = (record) => {
  if (isValidValue(record['Name'])) {
    return record['Name'].trim();
  }
  
  const nameParts = [
    record['First Name'],
    record['Middle Name'],
    record['Last Name'],
    record['Ext. Name']
  ].filter(isValidValue);
  
  return nameParts.join(' ');
};

// Helper to normalize date
const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return String(dateStr);
  }
};

// Get value from record using uniform header mapping
export const getUniformValue = (record, header, isExcelData = false) => {
  if (!record || !header) return '';
  
  const key = isExcelData ? header.excelKey : header.dbKey;
  let value = record[key];
  
  if (header.key === 'name') {
    value = isExcelData ? getExcelNameValue(record) : getDisplayName(record);
  } else if (header.key === 'birthdate' && value) {
    value = normalizeDate(value);
  }
  
  return value == null ? '' : String(value);
};

// Calculate string similarity percentage
export const getStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  return Math.round(stringSimilarity.compareTwoStrings(str1, str2) * 100);
};

// Calculate Levenshtein distance for misspelling detection
export const getLevenshteinDistance = (str1, str2) => {
  if (!str1 || !str2) return Infinity;
  
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[len2][len1];
};

// Detect misspelled names (similar length, small edit distance)
export const isMisspelledName = (str1, str2) => {
  if (!str1 || !str2) return false;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return false;
  
  const lengthDiff = Math.abs(s1.length - s2.length);
  const maxLength = Math.max(s1.length, s2.length);
  
  if (lengthDiff > MAX_LENGTH_DIFF || maxLength < MIN_NAME_LENGTH) return false;
  
  const distance = getLevenshteinDistance(s1, s2);
  const threshold = Math.max(1, Math.floor(maxLength * MISSPELLING_THRESHOLD));
  
  return distance <= threshold;
};

// Helper to calculate name similarity with misspelling detection
const calculateNameSimilarity = (dbName, excelName) => {
  if (!dbName || !excelName) return null;
  
  let similarity = getStringSimilarity(dbName, excelName);
  let bonus = 0;
  
  if (isMisspelledName(dbName, excelName)) {
    similarity = Math.max(similarity, MISSPELLING_SIMILARITY_BOOST);
    bonus = MISSPELLING_BONUS;
  }
  
  return { similarity, bonus };
};

// Helper to normalize date for comparison
const normalizeDateForComparison = (dateStr) => {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
};

// Calculate comprehensive similarity for multiple fields
export const getComprehensiveSimilarity = (dbRecord, excelRecord) => {
  const similarities = [];
  let totalBonus = 0;
  
  // Name fields
  const nameFields = [
    { db: dbRecord.first_name, excel: excelRecord['First Name'] },
    { db: dbRecord.middle_name, excel: excelRecord['Middle Name'] },
    { db: dbRecord.last_name, excel: excelRecord['Last Name'] }
  ];
  
  nameFields.forEach(({ db, excel }) => {
    const result = calculateNameSimilarity(db, excel);
    if (result) {
      similarities.push(result.similarity);
      totalBonus += result.bonus;
    }
  });
  
  // Birthday similarity
  const dbBirthdate = dbRecord.birthdate;
  const excelBirthdate = excelRecord['Birthdate'];
  if (dbBirthdate && excelBirthdate) {
    const normalizedDb = normalizeDateForComparison(dbBirthdate);
    const normalizedExcel = normalizeDateForComparison(excelBirthdate);
    similarities.push(getStringSimilarity(normalizedDb, normalizedExcel));
  }
  
  if (similarities.length === 0) return 0;
  
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  return Math.min(100, Math.round(avgSimilarity + (totalBonus / similarities.length)));
};

// Check if values are different (handles type coercion and null/undefined)
export const isDifferent = (dbValue, excelValue) => {
  if (dbValue == null && excelValue == null) return false;
  if (dbValue == null || excelValue == null) return true;
  return String(dbValue).trim() !== String(excelValue).trim();
};