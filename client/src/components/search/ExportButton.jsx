import { useState } from 'react';
import { Button, Dropdown, Spinner } from 'react-bootstrap';
import { Download, FileEarmarkExcel, FileEarmarkPdf, FileText } from 'react-bootstrap-icons';

const ExportButton = ({ data, filename = 'export', onExport, disabled = false }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      if (onExport) {
        await onExport(data, filename, format);
      } else {
        await exportData(data, filename, format);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportData = async (data, filename, format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}`;

    switch (format) {
      case 'json':
        exportJSON(data, fullFilename);
        break;
      case 'csv':
        exportCSV(data, fullFilename);
        break;
      case 'excel':
        await exportExcel(data, fullFilename);
        break;
      default:
        exportJSON(data, fullFilename);
    }
  };

  const exportJSON = (data, filename) => {
    const jsonData = JSON.stringify(data, null, 2);
    downloadFile(jsonData, `${filename}.json`, 'application/json');
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value || '';
        }).join(',')
      )
    ].join('\n');
    
    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  const exportExcel = async (data, filename) => {
    // For now, export as CSV since XLSX library would need to be imported
    exportCSV(data, filename);
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (exporting) {
    return (
      <Button variant="outline-success" disabled>
        <Spinner size="sm" className="me-2" />
        Exporting...
      </Button>
    );
  }

  return (
    <Dropdown>
      <Dropdown.Toggle variant="outline-success" disabled={disabled || !data || data.length === 0}>
        <Download className="me-1" size={16} />
        Export ({data?.length || 0})
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item onClick={() => handleExport('json')}>
          <FileText className="me-2" size={16} />
          JSON Format
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleExport('csv')}>
          <FileEarmarkExcel className="me-2" size={16} />
          CSV Format
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleExport('excel')}>
          <FileEarmarkExcel className="me-2" size={16} />
          Excel Format
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ExportButton;