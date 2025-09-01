import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Container, Button, Spinner, Alert, Table, Pagination, InputGroup, Card, Row, Col, Form, Badge } from "react-bootstrap";
import { Upload, Trash3, Database as DatabaseIcon, FileEarmarkExcel } from "react-bootstrap-icons";
import api from "../api/axios";
import SmartUpload from "../components/SmartUpload";

export default function Database() {
  // Get role from outlet context
  const { role } = useOutletContext();
  
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [file, setFile] = useState(null);
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

  const handleUpload = async () => {
    if (!file) return setError("Please select a file first");
    
    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      setLoading(true);
      setError("");
      await api.post("/api/upload-excel", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchData();
      setFile(null);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all data? This action cannot be undone.")) return;
    
    try {
      setLoading(true);
      setError("");
      await api.delete("/api/uploaded-beneficiaries");
      await fetchData();
      setFile(null);
    } catch (err) {
      setError("Failed to clear database.");
    } finally {
      setLoading(false);
    }
  };
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
          <DatabaseIcon className="me-2" size={28} />
          <h2 className="mb-0">Database Records</h2>
        </div>
      </div>

      {/* Admin Controls */}
      {role === "admin" && (
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-primary text-white d-flex align-items-center">
            <DatabaseIcon className="me-2" size={20} />
            <span className="fw-bold">Database Management</span>
            <Badge bg="light" text="dark" className="ms-auto">
              {data.length} records
            </Badge>
          </Card.Header>
          <Card.Body className="p-4">
            <Row className="g-4">
              <Col lg={6}>
                <Card className="h-100 border-success">
                  <Card.Header className="bg-light border-success">
                    <div className="d-flex align-items-center">
                      <Upload className="me-2 text-success" size={18} />
                      <span className="fw-semibold text-success">Smart Upload</span>
                      <Badge bg="success" className="ms-auto">Recommended</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <SmartUpload data={data} onDataRefresh={fetchData} />
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="h-100 border-warning">
                  <Card.Header className="bg-light border-warning">
                    <div className="d-flex align-items-center">
                      <FileEarmarkExcel className="me-2 text-warning" size={18} />
                      <span className="fw-semibold text-warning">Direct Upload</span>
                      <Badge bg="warning" text="dark" className="ms-auto">No Validation</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-3">
                      Upload Excel files directly without duplicate checking. Use with caution.
                    </p>
                    <div className="d-flex gap-2 align-items-center">
                      <Form.Control
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="flex-grow-1"
                      />
                      <Button
                        variant="warning"
                        onClick={handleUpload}
                        disabled={loading || !file}
                        className="d-flex align-items-center gap-1"
                      >
                        {loading ? (
                          <Spinner size="sm" animation="border" />
                        ) : (
                          <>
                            <Upload size={16} />
                            Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            <hr className="my-4" />
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                <strong>Database Status:</strong> {data.length > 0 ? `${data.length} beneficiaries loaded` : 'No data'}
              </div>
              <Button
                variant="outline-danger"
                onClick={handleClear}
                disabled={loading || data.length === 0}
                className="d-flex align-items-center gap-2"
              >
                <Trash3 size={16} />
                Clear All Data
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <InputGroup className="mb-4">
        <Form.Control
          type="text"
          placeholder="Search database..."
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
              <Card.Header>List of Beneficiaries</Card.Header>
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
