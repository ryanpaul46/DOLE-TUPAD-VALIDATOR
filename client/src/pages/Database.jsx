import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Container, Button, Form, Spinner, Alert, Table, Pagination, Card, Row, Col, InputGroup } from "react-bootstrap";
import api from "../api/axios";

export default function Database() {
  // Get role from outlet context
  const { role } = useOutletContext();
  
  // State management
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 20; // Increased items per page

  // Fetch data and column information
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch column information
      const columnsRes = await api.get("/api/uploaded-columns");
      setColumns(columnsRes.data.filter(col => col.column_name !== 'id')); // Exclude ID column
      
      // Fetch data
      const dataRes = await api.get("/api/uploaded-beneficiaries");
      setData(dataRes.data);
    } catch (err) {
      console.error("Failed fetching data:", err);
      setError("Failed fetching database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  // Upload Excel (Admin only)
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      setLoading(true);
      await api.post("/api/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Refresh data after successful upload
      await fetchData();
      setFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Clear database (Admin only)
  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all data?")) return;
    
    try {
      setLoading(true);
      await api.delete("/api/uploaded-beneficiaries");
      setData([]);
    } catch (err) {
      console.error("Failed to clear data:", err);
      setError("Failed to clear database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row => {
      // Check all columns for the search term
      return Object.values(row).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Format column names for display
  const formatColumnName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Simplified pagination - show only current page and nearby pages
  const getVisiblePages = () => {
    const delta = 1; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

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
            <div className="d-flex gap-2 flex-wrap align-items-center">
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
                {loading ? <Spinner size="sm" animation="border" /> : "Upload Excel"}
              </Button>
              <Button 
                variant="danger" 
                onClick={handleClear} 
                disabled={loading || data.length === 0}
                size="sm"
              >
                {loading ? <Spinner size="sm" animation="border" /> : "Clear Database"}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Search Bar */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Search</Card.Header>
            <Card.Body>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search for anything in the database..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setSearchTerm("")}
                  >
                    Clear
                  </Button>
                )}
              </InputGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Loading / Error / No Data */}
      {loading && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && filteredData.length === 0 && !error && (
        <Alert variant="info">
          {searchTerm 
            ? `No results found for "${searchTerm}".` 
            : "No data available. " + (role === "admin" ? "Upload an Excel file to get started." : "No records found.")
          }
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
              <Card.Footer>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-2">
                    <Pagination size="sm" className="mb-0">
                      <Pagination.Prev
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      />
                      
                      {getVisiblePages().map((page, idx) => (
                        <Pagination.Item
                          key={idx}
                          active={currentPage === page}
                          onClick={() => typeof page === 'number' && setCurrentPage(page)}
                          disabled={typeof page !== 'number'}
                        >
                          {page}
                        </Pagination.Item>
                      ))}
                      
                      <Pagination.Next
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      />
                    </Pagination>
                  </div>
                )}
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
