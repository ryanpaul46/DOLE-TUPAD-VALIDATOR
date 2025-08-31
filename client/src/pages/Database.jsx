import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Container, Button, Spinner, Alert, Table, Pagination, InputGroup, Card, Row, Col, Form } from "react-bootstrap";
import api from "../api/axios";

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
      await api.post("/api/upload-excel", formData);
      await fetchData();
      setFile(null);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all data?")) return;
    
    try {
      setLoading(true);
      setError("");
      await api.delete("/api/uploaded-beneficiaries");
      setData([]);
      setColumns([]);
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

  return (
    <Container fluid className="p-4 flex-grow-1 overflow-auto">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Uploaded Data</h2>
      </div>

      {/* Admin Controls */}
      {role === "admin" && (
        <Card className="mb-4">
          <Card.Header>Admin Controls</Card.Header>
          <Card.Body>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ maxWidth: "300px" }}
              />
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={loading || !file}
                size="sm"
              >
                {loading ? <Spinner size="sm" animation="border" /> : "Upload"}
              </Button>
              <Button
                variant="danger"
                onClick={handleClear}
                disabled={loading || data.length === 0}
                size="sm"
              >
                Clear
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
                              {row[col.column_name] !== null ? String(row[col.column_name]) : ''}
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
