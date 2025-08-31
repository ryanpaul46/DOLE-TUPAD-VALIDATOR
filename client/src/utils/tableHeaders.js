export const UNIFORM_HEADERS = [
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

export const getAvailableHeaders = (compareResult) => {
  if (!compareResult || (!compareResult.duplicates?.length && !compareResult.originals?.length)) {
    return [];
  }

  return UNIFORM_HEADERS.filter(header => {
    // Check duplicates data
    if (compareResult.duplicates?.length > 0) {
      return compareResult.duplicates.some(dup => 
        dup.excel_row.data.hasOwnProperty(header.excelKey) ||
        dup.database_record.hasOwnProperty(header.dbKey)
      );
    }
    
    // Check originals data
    if (compareResult.originals?.length > 0) {
      return compareResult.originals.some(orig => 
        orig.data.hasOwnProperty(header.excelKey)
      );
    }
    
    return false;
  });
};