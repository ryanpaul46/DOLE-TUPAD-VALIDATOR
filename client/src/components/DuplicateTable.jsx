import { useMemo, useCallback } from 'react';
import { Card, Form, Button, Table } from 'react-bootstrap';
import { Download } from 'react-bootstrap-icons';
import { getAvailableHeaders } from '../utils/tableHeaders';
import { getUniformValue, isDifferent } from '../utils/dataUtils';
import { getDisplayName } from '../utils/nameUtils';

export default function DuplicateTable({ 
  compareResult, 
  searchTerm, 
  onSearch, 
  filteredDuplicates, 
  onDownload,
  downloadLabel = "Download Excel"
}) {
  const duplicateTableData = useMemo(() => {
    if (!compareResult?.duplicates) return [];
    
    const duplicatesToShow = searchTerm ? filteredDuplicates : compareResult.duplicates;
    const data = [];
    duplicatesToShow.forEach((dup, idx) => {
      data.push({
        _source: 'Database',
        _index: idx * 2,
        _originalData: dup.database_record,
        _pairedData: dup.excel_row?.data || dup.excel_row,
        _isExcel: false,
        _originalDuplicate: dup
      });
      
      data.push({
        _source: 'Excel',
        _index: idx * 2 + 1,
        _originalData: dup.excel_row?.data || dup.excel_row,
        _pairedData: dup.database_record,
        _isExcel: true,
        _originalDuplicate: dup
      });
    });
    return data;
  }, [compareResult, filteredDuplicates, searchTerm]);

  const duplicateTableHeaders = useMemo(() => {
    const availableHeaders = getAvailableHeaders(compareResult);
    return [
      { key: '_source', label: 'Source', width: 120 },
      { key: '_similarity', label: 'Similarity %', width: 100 },
      ...availableHeaders.map(header => ({
        ...header,
        width: header.key === 'name' ? 250 :
               header.key === 'first_name' || header.key === 'last_name' ? 180 :
               header.key === 'project_series' || header.key === 'id_number' ? 250 :
               header.key === 'barangay' || header.key === 'city_municipality' || header.key === 'province' ? 180 :
               130
      }))
    ];
  }, [compareResult]);

  const renderDuplicateCell = useCallback((rowData, header) => {
    if (!rowData || !header) {
      return <span className="text-muted">-</span>;
    }

    if (header.key === '_source') {
      return (
        <span className={`fw-bold ${rowData._source === 'Database' ? 'text-info' : 'text-warning'}`}>
          {rowData._source || 'Unknown'}
        </span>
      );
    }

    if (header.key === '_similarity') {
      // Use unified similarity score if available, otherwise calculate
      const similarity = rowData._originalDuplicate?.similarity_score || 0;
      
      return (
        <span className={`fw-bold ${
          similarity >= 80 ? 'text-success' :
          similarity >= 60 ? 'text-warning' : 'text-danger'
        }`}>
          {similarity}%
        </span>
      );
    }
    
    const currentValue = getUniformValue(rowData._originalData || {}, header, rowData._isExcel);
    const pairedValue = getUniformValue(rowData._pairedData || {}, header, !rowData._isExcel);
    const isDiff = isDifferent(currentValue, pairedValue);
    
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      return <span className="text-muted">-</span>;
    }
    
    const displayValue = String(currentValue);
    
    return (
      <span
        className={isDiff ? (rowData._source === 'Database' ? 'fw-bold text-warning' : 'fw-bold text-danger') : ''}
        title={displayValue}
      >
        {displayValue}
      </span>
    );
  }, []);

  if (!compareResult?.duplicates?.length) return null;

  return (
    <Card className="mb-4">
      <Card.Header className="text-danger">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span>Duplicate Rows Comparison ({compareResult.duplicates.length} duplicates found)</span>
          <Button
            variant="outline-success"
            size="sm"
            onClick={onDownload}
            className="d-flex align-items-center gap-1"
          >
            <Download size={16} />
            {downloadLabel}
          </Button>
        </div>
        <Form.Control
          type="text"
          placeholder="Search duplicates by name..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          size="sm"
          className="mt-2"
        />
      </Card.Header>
      <Card.Body className="p-0">
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm" className="mb-0">
            <thead className="position-sticky top-0 bg-light">
              <tr>
                {duplicateTableHeaders.map(header => (
                  <th key={header.key}>{header.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {duplicateTableData.map((row, idx) => (
                <tr key={idx}>
                  {duplicateTableHeaders.map(header => (
                    <td key={header.key}>
                      {renderDuplicateCell(row, header)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}