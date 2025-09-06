import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Pagination, Alert, Badge, Button, Form, InputGroup, Spinner, Modal } from 'react-bootstrap';
import { Eye, FileText, Search } from 'react-bootstrap-icons';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import api from '../api/axios';

const BeneficiariesManager = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'search'
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [columnsRes, dataRes] = await Promise.all([
        api.get('/api/uploaded-columns'),
        api.get('/api/uploaded-beneficiaries')
      ]);
      setColumns(columnsRes.data.filter(col => col.column_name !== 'id'));
      setData(dataRes.data);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => 
      Object.values(row).some(value => 
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const handleViewDetails = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBeneficiary(null);
  };



  return (
    <Container fluid className="p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <FileText className="me-2" size={28} />
              <div>
                <h2 className="mb-0">Beneficiaries Manager</h2>
                <p className="text-muted mb-0">Search and manage beneficiary records</p>
              </div>
            </div>
            <div>
              <Button 
                variant={viewMode === 'summary' ? 'primary' : 'outline-primary'}
                className="me-2"
                onClick={() => setViewMode('summary')}
              >
                Summary View
              </Button>
              <Button 
                variant={viewMode === 'search' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('search')}
              >
                Search View
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <InputGroup>
            <InputGroup.Text><Search /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search beneficiaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                Clear
              </Button>
            )}
          </InputGroup>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      {loading && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && filteredData.length === 0 && !error && (
        <Alert variant="info">
          {searchTerm ? 'No results found.' : 'No data available.'}
        </Alert>
      )}

      {!loading && filteredData.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Beneficiaries ({viewMode === 'summary' ? 'Summary' : 'Search'} View)</span>
                  <Badge bg="info">
                    {filteredData.length} of {data.length} records
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive" style={{ maxHeight: '60vh', overflow: 'auto' }}>
                  <Table striped bordered hover size="sm">
                    <thead className="position-sticky top-0 bg-light">
                      <tr>
                        {viewMode === 'search' ? (
                          <>
                            <th>Name</th>
                            <th>ID Number</th>
                            <th>Province</th>
                            <th>Municipality</th>
                            <th>Project Series</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>Actions</th>
                          </>
                        ) : (
                          <>
                            {columns.map((col, idx) => (
                              <th key={idx}>
                                {col.column_name.split('_').map(word => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </th>
                            ))}
                            <th>Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {viewMode === 'search' ? (
                            <>
                              <td className="fw-bold">{row.name || 'N/A'}</td>
                              <td>{row.id_number || 'N/A'}</td>
                              <td>{row.province || 'N/A'}</td>
                              <td>{row.city_municipality || 'N/A'}</td>
                              <td>
                                <Badge bg="primary" className="small">
                                  {row.project_series || 'N/A'}
                                </Badge>
                              </td>
                              <td>{row.sex || 'N/A'}</td>
                              <td>{row.age || 'N/A'}</td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleViewDetails(row)}
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </Button>
                              </td>
                            </>
                          ) : (
                            <>
                              {columns.map((col, colIdx) => (
                                <td key={colIdx}>
                                  {col.column_name === 'birthdate' && row[col.column_name] 
                                    ? new Date(row[col.column_name]).toLocaleDateString()
                                    : row[col.column_name] || ''
                                  }
                                </td>
                              ))}
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleViewDetails(row)}
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </Button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
              {totalPages > 1 && (
                <Card.Footer>
                  <div className="d-flex justify-content-center">
                    <Pagination size="sm">
                      <Pagination.Prev
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      />
                      <Pagination.Item active>{currentPage}</Pagination.Item>
                      <Pagination.Next
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      />
                    </Pagination>
                  </div>
                </Card.Footer>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Beneficiary Details Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Beneficiary Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBeneficiary && (
            <Row>
              {columns.map((col, idx) => (
                <Col md={6} key={idx} className="mb-3">
                  <strong>
                    {col.column_name.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}:
                  </strong>
                  <div className="text-muted">
                    {col.column_name === 'birthdate' && selectedBeneficiary[col.column_name]
                      ? new Date(selectedBeneficiary[col.column_name]).toLocaleDateString()
                      : selectedBeneficiary[col.column_name] || 'N/A'
                    }
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BeneficiariesManager;