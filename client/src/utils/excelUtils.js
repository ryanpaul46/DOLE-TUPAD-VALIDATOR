import * as XLSX from 'xlsx';
import { getAvailableHeaders } from './tableHeaders';
import { getUniformValue } from './dataUtils';

export const downloadDuplicatesAsExcel = (compareResult) => {
  if (!compareResult?.duplicates?.length) {
    alert('No duplicate data to download');
    return;
  }

  const availableHeaders = getAvailableHeaders(compareResult);
  const workbookData = [];

  // Add headers
  const headerRow = ['Source', ...availableHeaders.map(h => h.label)];
  workbookData.push(headerRow);

  // Add duplicate comparison data
  compareResult.duplicates.forEach((dup) => {
    // Database row
    const dbRow = [
      'Database',
      ...availableHeaders.map(header =>
        getUniformValue(dup.database_record, header, false)
      )
    ];
    workbookData.push(dbRow);

    // Excel row
    const excelRow = [
      'Excel',
      ...availableHeaders.map(header =>
        getUniformValue(dup.excel_row.data, header, true)
      )
    ];
    workbookData.push(excelRow);

    // Empty row for spacing
    workbookData.push(['']);
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(workbookData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Duplicate Comparison');

  // Generate filename with current date
  const currentDate = new Date().toISOString().slice(0, 10);
  const filename = `DOLE_TUPAD_Duplicates_${currentDate}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
};