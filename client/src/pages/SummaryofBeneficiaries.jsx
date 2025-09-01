import { useState, useEffect, useMemo } from "react";
import { Container, Spinner, Alert, Table, Pagination, InputGroup, Card, Row, Col, Form, Button } from "react-bootstrap";
import { FileText } from "react-bootstrap-icons";
import api from "../api/axios";

export default function SummaryofBeneficiaries() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [columnsRes, dataRes] = await Promise.all([
        api.get("/api/uploaded-columns"),
        api.get("/api/uploaded-beneficiaries")
      ]);
      setColumns(columnsRes.data.filter(col => col.column_name !== 'id'));
      setData(dataRes.data);
    } catch (err) {
      setError("Failed fetching database.");
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

  const formatColumnName = (name) => 
    name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const formatCellValue = (value, columnName) => {
    if (value === null || value === undefined) return '';
    if (columnName === 'birthdate' && value) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  return (
    <Container fluid className="p-4 flex-grow-1 overflow-auto">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <FileText className="me-2" size={28} />
          <h2 className="mb-0">Summary of Beneficiaries</h2>
        </div>
      </div>

      <InputGroup className="mb-4">
        <Form.Control
          type="text"
          placeholder="Search beneficiaries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <Button variant="outline-secondary" onClick={() => setSearchTerm("")}>
            Clear
          </Button>
        )}
      </InputGroup>

      {/* Loading / Error / No Data */}
      {loading && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && filteredData.length === 0 && !error && (
        <Alert variant="info">
          {searchTerm ? `No results found.` : "No data available."}
        </Alert>
      )}

      {/* Data Display */}
      {!loading && filteredData.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span>List of Beneficiaries</span>
                  <span className="text-muted">
                    {filteredData.length} of {data.length} records
                  </span>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-container" style={{ maxHeight: "60vh", overflow: "auto" }}>
                  <Table striped bordered hover size="sm" className="table-layout-auto mb-0">
                    <thead className="position-sticky top-0 bg-light">
                      <tr>
                        {columns.map((col, idx) => (
                          <th key={idx} className="align-middle">
                            {formatColumnName(col.column_name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {columns.map((col, colIdx) => (
                            <td key={colIdx} className="align-middle">
                              {formatCellValue(row[col.column_name], col.column_name)}
                            </td>
                          ))}
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
    </Container>
  );
}