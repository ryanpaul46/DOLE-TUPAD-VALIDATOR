import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table } from 'react-bootstrap';

const VirtualizedTable = ({ 
  data = [], 
  headers = [], 
  height = 400, 
  rowHeight = 50,
  className = "",
  onRowClick = null,
  renderCell = null,
  loading = false 
}) => {
  // Memoize the table structure for performance
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  // Default cell renderer with better null/undefined handling
  const defaultRenderCell = (rowData, header, rowIndex, cellIndex) => {
    if (!rowData || !header) {
      return <span className="text-muted">-</span>;
    }

    // Try different possible keys for the header
    let value = null;
    
    // First try the primary key
    if (header.key && rowData.hasOwnProperty(header.key)) {
      value = rowData[header.key];
    }
    // Then try dbKey if available
    else if (header.dbKey && rowData.hasOwnProperty(header.dbKey)) {
      value = rowData[header.dbKey];
    }
    // Then try excelKey if available
    else if (header.excelKey && rowData.hasOwnProperty(header.excelKey)) {
      value = rowData[header.excelKey];
    }
    
    // Only show "-" for truly null/undefined values, preserve empty strings and other falsy values
    if (value === null || value === undefined) {
      return <span className="text-muted">-</span>;
    }
    
    // Convert to string and handle empty strings
    const displayValue = String(value);
    
    // Show empty strings as empty, not as "-"
    return <span title={displayValue || 'Empty'}>{displayValue || <span className="text-muted">-</span>}</span>;
  };

  // Row component for virtualization
  const Row = ({ index, style }) => {
    const rowData = tableData[index];
    const isEvenRow = index % 2 === 0;

    if (!rowData) {
      return (
        <div style={style} className="d-flex align-items-center justify-content-center">
          <span>Loading...</span>
        </div>
      );
    }

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #dee2e6',
          backgroundColor: isEvenRow ? '#f8f9fa' : 'white'
        }}
        className={onRowClick ? 'cursor-pointer' : ''}
        onClick={() => onRowClick && onRowClick(rowData, index)}
      >
        {headers.map((header, cellIndex) => (
          <div
            key={cellIndex}
            style={{
              flex: header.width ? `0 0 ${header.width}px` : '1',
              padding: '8px 12px',
              borderRight: cellIndex < headers.length - 1 ? '1px solid #dee2e6' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={(() => {
              if (renderCell) {
                const rendered = renderCell(rowData, header, index, cellIndex);
                return rendered?.props?.title || rendered?.props?.children || '';
              } else {
                const value = rowData[header.key] || rowData[header.dbKey] || rowData[header.excelKey] || '';
                return String(value || '').trim();
              }
            })()}
          >
            {renderCell ? 
              renderCell(rowData, header, index, cellIndex) : 
              defaultRenderCell(rowData, header, index, cellIndex)
            }
          </div>
        ))}
      </div>
    );
  };

  // Header component
  const TableHeader = () => (
    <div
      style={{
        display: 'flex',
        backgroundColor: '#e9ecef',
        borderBottom: '2px solid #dee2e6',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        fontWeight: 'bold'
      }}
    >
      {headers.map((header, index) => (
        <div
          key={index}
          style={{
            flex: header.width ? `0 0 ${header.width}px` : '1',
            padding: '12px',
            borderRight: index < headers.length - 1 ? '1px solid #dee2e6' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={header.label}
        >
          {header.label}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div 
        className={`border ${className}`}
        style={{ height }}
      >
        <TableHeader />
        <div 
          className="d-flex align-items-center justify-content-center"
          style={{ height: height - 50 }}
        >
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2">Loading data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div 
        className={`border ${className}`}
        style={{ height }}
      >
        <TableHeader />
        <div 
          className="d-flex align-items-center justify-content-center"
          style={{ height: height - 50 }}
        >
          <div className="text-muted">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border ${className}`}>
      <TableHeader />
      <List
        height={height - 50} // Subtract header height
        itemCount={tableData.length}
        itemSize={rowHeight}
        overscanCount={10} // Render extra rows for smooth scrolling
        style={{
          border: 'none'
        }}
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedTable;