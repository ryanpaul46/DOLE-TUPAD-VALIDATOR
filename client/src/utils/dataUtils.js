import { getDisplayName, concatenateFullName } from './nameUtils';

export const getUniformValue = (record, header, isExcelData = false) => {
  if (!record || !header) return '';
  
  const key = isExcelData ? header.excelKey : header.dbKey;
  let value = record[key];
  
  // Special handling for name field with concatenation
  if (header.key === 'name') {
    if (isExcelData) {
      if (record['Name'] && record['Name'].trim() && record['Name'].trim() !== 'null' && record['Name'].trim() !== 'undefined') {
        value = record['Name'].trim();
      } else {
        const nameParts = [
          record['First Name'],
          record['Middle Name'],
          record['Last Name'],
          record['Ext. Name']
        ].filter(part => part && part.toString().trim().length > 0 && part.toString().trim() !== 'null' && part.toString().trim() !== 'undefined');
        value = nameParts.join(' ');
      }
    } else {
      value = getDisplayName(record);
    }
  }
  
  // Handle dates
  if (header.key === 'birthdate' && value) {
    try {
      const date = new Date(value);
      value = date.toLocaleDateString();
    } catch (e) {
      // Keep original value if date parsing fails
    }
  }
  
  return value === null || value === undefined ? '' : String(value);
};

export const isDifferent = (dbValue, excelValue) => {
  return dbValue !== excelValue;
};

export const formatDate = (dateValue) => {
  if (!dateValue) return '';
  try {
    return new Date(dateValue).toLocaleDateString();
  } catch {
    return dateValue;
  }
};