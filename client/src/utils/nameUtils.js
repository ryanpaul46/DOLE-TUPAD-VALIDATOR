export const concatenateFullName = (record) => {
  if (!record) return '';
  
  const nameParts = [
    record.first_name,
    record.middle_name,
    record.last_name,
    record.ext_name
  ].filter(part => part && part.trim() && part.trim() !== 'null' && part.trim() !== 'undefined');
  
  return nameParts.join(' ');
};

export const getDisplayName = (record) => {
  if (!record) return '';
  
  if (record.name && record.name.trim() && record.name.trim() !== 'null' && record.name.trim() !== 'undefined') {
    return record.name.trim();
  }
  
  return concatenateFullName(record);
};

export const isNameConcatenated = (record) => {
  return !record.name || !record.name.trim() || record.name.trim() === 'null' || record.name.trim() === 'undefined';
};

export const isExcelNameConcatenated = (record) => {
  return !record['Name'] || !record['Name'].trim() || record['Name'].trim() === 'null' || record['Name'].trim() === 'undefined';
};