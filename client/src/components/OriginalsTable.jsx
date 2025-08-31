import { useMemo } from 'react';
import { Card, Table } from 'react-bootstrap';
import { getAvailableHeaders } from '../utils/tableHeaders';
import { getUniformValue } from '../utils/dataUtils';

export default function OriginalsTable({ compareResult }) {
  const originalsData = useMemo(() => {
    if (!compareResult?.originals) return [];
    return compareResult.originals.map(row => ({
      ...row.data,
      _row_number: row.row_number
    }));
  }, [compareResult]);

  const originalsHeaders = useMemo(() => {
    const availableHeaders = getAvailableHeaders(compareResult);
    return [
      { key: '_row_number', label: 'Row #', width: 80 },
      ...availableHeaders.map(header => ({
        ...header,
        width: header.key === 'name' ? 200 : 150
      }))
    ];
  }, [compareResult]);

  const renderOriginalsCell = (rowData, header) => {
    if (header.key === '_row_number') {
      return <span className="fw-bold text-success">{rowData._row_number}</span>;
    }
    const value = getUniformValue(rowData, header, true);
    return <span title={value}>{value}</span>;
  };

  if (!compareResult?.originals?.length) return null;

  return (
    <Card className="mb-4">
      <Card.Header className="text-success">
        Original Rows (Not in Database) - {compareResult.originals.length} records
      </Card.Header>
      <Card.Body className="p-0">
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm" className="mb-0">
            <thead className="position-sticky top-0 bg-light">
              <tr>
                {originalsHeaders.map(header => (
                  <th key={header.key}>{header.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {originalsData.map((row, idx) => (
                <tr key={idx}>
                  {originalsHeaders.map(header => (
                    <td key={header.key}>
                      {renderOriginalsCell(row, header)}
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