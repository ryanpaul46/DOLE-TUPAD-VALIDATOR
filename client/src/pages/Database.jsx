import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Container, Button, Spinner, Alert, Card, Row, Col, Form, Badge } from "react-bootstrap";
import { Upload, Trash3, Database as DatabaseIcon, FileEarmarkExcel, Search } from "react-bootstrap-icons";
import api from "../api/axios";
import SmartUpload from "../components/SmartUpload";
import GlobalSearch from "../components/search/GlobalSearch";
import ExportButton from "../components/search/ExportButton";
import { useGlobalSearch } from "../hooks/useGlobalSearch";

export default function Database() {
  // Get role from outlet context
  const { role } = useOutletContext();
  
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [projectSeries, setProjectSeries] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  const {
    searchResults,
    loading: searchLoading,
    totalResults,
    handleSearch,
    handleFilter,
    exportResults
  } = useGlobalSearch();


  const fetchData = async () => {
    try {
      setLoading(true);
      const [columnsRes, dataRes, projectRes] = await Promise.all([
        api.get("/api/uploaded-columns"),
        api.get("/api/uploaded-beneficiaries"),
        api.get("/api/beneficiaries-by-project-series")
      ]);
      setColumns(columnsRes.data.filter(col => col.column_name !== 'id'));
      setData(dataRes.data);
      setProjectSeries(projectRes.data.projectSeries || []);
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

  const handleDeleteProject = async () => {
    if (!selectedProject) return setError("Please select a project series first");
    
    const projectName = projectSeries.find(p => p.project_series === selectedProject)?.project_series;
    if (!window.confirm(`Are you sure you want to delete all records for "${projectName}"? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      setError("");
      await api.delete(`/api/delete-project-series/${encodeURIComponent(selectedProject)}`);
      await fetchData();
      setSelectedProject("");
    } catch (err) {
      setError("Failed to delete project series.");
    } finally {
      setLoading(false);
    }
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
            
            {/* Delete by Project Series */}
            <Row className="mb-3">
              <Col>
                <Card className="border-danger">
                  <Card.Header className="bg-light border-danger">
                    <div className="d-flex align-items-center">
                      <Trash3 className="me-2 text-danger" size={18} />
                      <span className="fw-semibold text-danger">Delete by Project Series</span>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex gap-2 align-items-center">
                      <Form.Select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="flex-grow-1"
                        disabled={loading || projectSeries.length === 0}
                      >
                        <option value="">Select Project Series to Delete</option>
                        {projectSeries.map((project, idx) => (
                          <option key={idx} value={project.project_series}>
                            {project.project_series} ({project.beneficiary_count} records)
                          </option>
                        ))}
                      </Form.Select>
                      <Button
                        variant="danger"
                        onClick={handleDeleteProject}
                        disabled={loading || !selectedProject}
                        className="d-flex align-items-center gap-1"
                      >
                        {loading ? (
                          <Spinner size="sm" animation="border" />
                        ) : (
                          <>
                            <Trash3 size={16} />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
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

      {/* Loading / Error */}
      {loading && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Search Section */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Search className="me-2" size={20} />
            <span className="fw-bold">Search & Export Data</span>
          </div>
          <Button
            variant={showSearch ? "outline-secondary" : "primary"}
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? "Hide Search" : "Show Search"}
          </Button>
        </Card.Header>
        {showSearch && (
          <Card.Body>
            <GlobalSearch
              onSearch={handleSearch}
              onFilter={handleFilter}
              placeholder="Search all beneficiaries by name, ID, province..."
            />
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Badge bg="info">
                {totalResults.toLocaleString()} results found
              </Badge>
              <ExportButton
                data={searchResults}
                filename="database_export"
                onExport={async (data, filename, format) => {
                  try {
                    await exportResults(format);
                  } catch (error) {
                    console.error('Export failed:', error);
                  }
                }}
                disabled={searchLoading || searchResults.length === 0}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table table-striped table-sm">
                  <thead className="table-dark sticky-top">
                    <tr>
                      <th>Name</th>
                      <th>ID</th>
                      <th>Province</th>
                      <th>Municipality</th>
                      <th>Project Series</th>
                      <th>Gender</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.slice(0, 100).map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="fw-bold">{item.name || 'N/A'}</td>
                        <td>{item.id_number || 'N/A'}</td>
                        <td>{item.province || 'N/A'}</td>
                        <td>{item.city_municipality || 'N/A'}</td>
                        <td>
                          <Badge bg="primary" className="small">
                            {item.project_series || 'N/A'}
                          </Badge>
                        </td>
                        <td>{item.sex || 'N/A'}</td>
                        <td>{item.age || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {searchResults.length > 100 && (
                  <div className="text-center text-muted small mt-2">
                    Showing first 100 results. Use export to get all {totalResults.toLocaleString()} results.
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        )}
      </Card>
      
      {!loading && !error && (
        <Alert variant="success">
          Database management completed. Use search above to explore data or view Summary section.
        </Alert>
      )}
    </Container>
  );
}
