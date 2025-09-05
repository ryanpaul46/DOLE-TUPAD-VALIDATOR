import { useState } from 'react';
import { Container, Row, Col, Card, Table, Pagination, Alert, Badge, Button } from 'react-bootstrap';
import { Eye, Download } from 'react-bootstrap-icons';
import GlobalSearch from '../components/search/GlobalSearch';
import ExportButton from '../components/search/ExportButton';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

const SearchBeneficiaries = () => {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const { toasts, showToast, removeToast } = useToast();
  
  const {
    searchResults,
    loading,
    error,
    totalResults,
    currentPage,
    handleSearch,
    handleFilter,
    handlePageChange,
    exportResults
  } = useGlobalSearch();

  const handleExport = async (data, filename, format) => {
    try {
      await exportResults(format);
      showToast(`Data exported successfully as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showToast('Failed to export data', 'danger');
    }
  };

  const totalPages = Math.ceil(totalResults / 50);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
        {items}
        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  return (
    <Container fluid className="p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <Row className="mb-4">
        <Col>
          <h2>Search Beneficiaries</h2>
          <p className="text-muted">Search and filter through all beneficiary records</p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <GlobalSearch
                onSearch={handleSearch}
                onFilter={handleFilter}
                placeholder="Search by name, ID, province, or any field..."
              />
              
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Badge bg="info" className="me-2">
                    {totalResults.toLocaleString()} results found
                  </Badge>
                  {loading && <Badge bg="secondary">Searching...</Badge>}
                </div>
                <ExportButton
                  data={searchResults}
                  filename="beneficiaries_search"
                  onExport={handleExport}
                  disabled={loading || searchResults.length === 0}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {searchResults.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead className="table-dark">
                        <tr>
                          <th>Name</th>
                          <th>ID Number</th>
                          <th>Province</th>
                          <th>Municipality</th>
                          <th>Project Series</th>
                          <th>Gender</th>
                          <th>Age</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((beneficiary, index) => (
                          <tr key={beneficiary.id || index}>
                            <td className="fw-bold">{beneficiary.name || 'N/A'}</td>
                            <td>{beneficiary.id_number || 'N/A'}</td>
                            <td>{beneficiary.province || 'N/A'}</td>
                            <td>{beneficiary.city_municipality || 'N/A'}</td>
                            <td>
                              <Badge bg="primary" className="small">
                                {beneficiary.project_series || 'N/A'}
                              </Badge>
                            </td>
                            <td>{beneficiary.sex || 'N/A'}</td>
                            <td>{beneficiary.age || 'N/A'}</td>
                            <td>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => setSelectedBeneficiary(beneficiary)}
                              >
                                <Eye size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  
                  {renderPagination()}
                </>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">
                    {loading ? 'Searching...' : 'No beneficiaries found matching your criteria'}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SearchBeneficiaries;