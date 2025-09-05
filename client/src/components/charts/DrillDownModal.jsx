import { Modal, Button, Table, Badge, Row, Col, Card } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter } from 'react-bootstrap-icons';

const DrillDownModal = ({ 
  show, 
  onHide, 
  title, 
  data, 
  selectedItem,
  onExport,
  onFilter 
}) => {
  const [filteredData, setFilteredData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    if (data) {
      setFilteredData(data);
    }
  }, [data]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredData(sorted);
  };

  const getSummaryStats = () => {
    if (!filteredData || filteredData.length === 0) return null;

    const total = filteredData.reduce((sum, item) => sum + (item.count || item.value || 1), 0);
    const average = total / filteredData.length;
    const max = Math.max(...filteredData.map(item => item.count || item.value || 1));
    const min = Math.min(...filteredData.map(item => item.count || item.value || 1));

    return { total, average, max, min };
  };

  const stats = getSummaryStats();

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <Button variant="link" className="p-0 me-2" onClick={onHide}>
            <ArrowLeft size={20} />
          </Button>
          Drill Down: {title}
          {selectedItem && (
            <Badge bg="primary" className="ms-2">
              {selectedItem.label || selectedItem.name || selectedItem.project_series || selectedItem.province}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Summary Statistics */}
        {stats && (
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center border-primary">
                <Card.Body className="py-2">
                  <h5 className="text-primary mb-0">{stats.total.toLocaleString()}</h5>
                  <small className="text-muted">Total Records</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-success">
                <Card.Body className="py-2">
                  <h5 className="text-success mb-0">{Math.round(stats.average).toLocaleString()}</h5>
                  <small className="text-muted">Average</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-warning">
                <Card.Body className="py-2">
                  <h5 className="text-warning mb-0">{stats.max.toLocaleString()}</h5>
                  <small className="text-muted">Maximum</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-info">
                <Card.Body className="py-2">
                  <h5 className="text-info mb-0">{stats.min.toLocaleString()}</h5>
                  <small className="text-muted">Minimum</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Action Buttons */}
        <div className="d-flex justify-content-between mb-3">
          <div>
            <Button variant="outline-primary" size="sm" onClick={onFilter}>
              <Filter className="me-1" size={16} />
              Filter Data
            </Button>
          </div>
          <div>
            <Button variant="outline-success" size="sm" onClick={onExport}>
              <Download className="me-1" size={16} />
              Export Data
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm">
            <thead className="sticky-top bg-light">
              <tr>
                {filteredData.length > 0 && Object.keys(filteredData[0]).map(key => (
                  <th 
                    key={key}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort(key)}
                    className="text-nowrap"
                  >
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {sortConfig.key === key && (
                      <span className="ms-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={index}>
                  {Object.entries(item).map(([key, value]) => (
                    <td key={key} className="text-nowrap">
                      {typeof value === 'number' 
                        ? value.toLocaleString() 
                        : value || 'N/A'
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted">No data available for drill down</p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <small className="text-muted align-self-center">
            Showing {filteredData.length} records
          </small>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default DrillDownModal;