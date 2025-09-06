import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Container, Button, Spinner, Alert, Card, Row, Col, Form, Badge, Tabs, Tab, Table, ProgressBar } from "react-bootstrap";
import { Upload, Trash3, Database as DatabaseIcon, FileEarmarkExcel, Search, HddStack, CloudDownload, Activity } from "react-bootstrap-icons";
import api from "../api/axios";
import SmartUpload from "../components/SmartUpload";
import GlobalSearch from "../components/search/GlobalSearch";
import ExportButton from "../components/search/ExportButton";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useCSRF } from "../hooks/useCSRF";
import { useToast } from "../hooks/useToast";
import ToastContainer from "../components/ToastContainer";

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
  
  const { refreshCSRFToken } = useCSRF();
  const { toasts, showToast, removeToast } = useToast();
  
  // Database Management states
  const [dbStatus, setDbStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);


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
    fetchDbStatus();
    fetchBackups();
    
    const interval = setInterval(fetchDbStatus, 30000);
    return () => clearInterval(interval);
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
      
      // Get fresh CSRF token
      await refreshCSRFToken();
      
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
      
      // Get fresh CSRF token
      await refreshCSRFToken();
      
      await api.delete(`/api/delete-project-series/${encodeURIComponent(selectedProject)}`);
      await fetchData();
      setSelectedProject("");
    } catch (err) {
      setError("Failed to delete project series.");
    } finally {
      setLoading(false);
    }
  };

  // Database Management functions
  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/db-status');
      setDbStatus(response.data);
    } catch (error) {
      showToast('Failed to fetch database status', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await api.get('/api/backups');
      setBackups(response.data.backups || []);
    } catch (error) {
      showToast('Failed to fetch backups', 'danger');
    }
  };

  const createBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await api.post('/api/backup');
      if (response.data.success) {
        showToast(`Backup created: ${response.data.filename}`, 'success');
        fetchBackups();
      } else {
        showToast('Backup failed: ' + response.data.error, 'danger');
      }
    } catch (error) {
      showToast('Failed to create backup', 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/migrate-timestamps');
      if (response.data.success) {
        showToast('Database migration completed successfully', 'success');
        fetchDbStatus();
      } else {
        showToast('Migration failed: ' + response.data.error, 'danger');
      }
    } catch (error) {
      showToast('Failed to run migration', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const getPoolHealthColor = (pool) => {
    if (!pool) return 'secondary';
    const utilization = (pool.totalCount - pool.idleCount) / pool.totalCount;
    if (utilization > 0.8) return 'danger';
    if (utilization > 0.6) return 'warning';
    return 'success';
  };


  return (
    <Container fluid className="p-4 flex-grow-1 overflow-auto">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <DatabaseIcon className="me-2" size={28} />
          <h2 className="mb-0">Database Management</h2>
        </div>
      </div>

      <Tabs defaultActiveKey="records" className="mb-4">
        <Tab eventKey="records" title="Database Records">

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
        </Tab>
        
        <Tab eventKey="management" title="System Management">
          {/* Database Status */}
          <Row className="mb-4">
            <Col lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Header className="bg-primary text-white">
                  <Activity className="me-2" />
                  Connection Pool
                </Card.Header>
                <Card.Body>
                  {dbStatus?.pool ? (
                    <>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Active Connections</span>
                        <Badge bg={getPoolHealthColor(dbStatus.pool)}>
                          {dbStatus.pool.totalCount - dbStatus.pool.idleCount}/{dbStatus.pool.totalCount}
                        </Badge>
                      </div>
                      <ProgressBar 
                        now={((dbStatus.pool.totalCount - dbStatus.pool.idleCount) / dbStatus.pool.totalCount) * 100}
                        variant={getPoolHealthColor(dbStatus.pool)}
                        className="mb-2"
                      />
                      <small className="text-muted">
                        Idle: {dbStatus.pool.idleCount} | Waiting: {dbStatus.pool.waitingCount}
                      </small>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="spinner-border spinner-border-sm" />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Header className="bg-info text-white">
                  <HddStack className="me-2" />
                  Cache Status
                </Card.Header>
                <Card.Body>
                  {dbStatus?.cache ? (
                    <>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Status</span>
                        <Badge bg={dbStatus.cache.connected ? 'success' : 'secondary'}>
                          {dbStatus.cache.connected ? 'Connected' : 'Disabled'}
                        </Badge>
                      </div>
                      {dbStatus.cache.connected && (
                        <>
                          <div className="d-flex justify-content-between mb-1">
                            <span>Keys</span>
                            <span>{dbStatus.cache.keyCount}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Memory</span>
                            <span>{dbStatus.cache.memory}</span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="spinner-border spinner-border-sm" />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Header className="bg-success text-white">
                  <CloudDownload className="me-2" />
                  Backup Status
                </Card.Header>
                <Card.Body>
                  {dbStatus?.backup ? (
                    <>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total Backups</span>
                        <Badge bg="success">{dbStatus.backup.count}</Badge>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total Size</span>
                        <span>{dbStatus.backup.totalSize}</span>
                      </div>
                      <div className="d-grid gap-2">
                        <Button 
                          variant="outline-success" 
                          size="sm"
                          onClick={createBackup}
                          disabled={backupLoading}
                        >
                          {backupLoading ? 'Creating...' : 'Create Backup'}
                        </Button>
                        <Button 
                          variant="outline-warning" 
                          size="sm"
                          onClick={runMigration}
                          disabled={loading}
                        >
                          {loading ? 'Migrating...' : 'Fix Timestamps'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="spinner-border spinner-border-sm" />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Backup History */}
          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <strong>Backup History</strong>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="float-end"
                    onClick={fetchBackups}
                  >
                    Refresh
                  </Button>
                </Card.Header>
                <Card.Body>
                  {backups.length > 0 ? (
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Filename</th>
                          <th>Size</th>
                          <th>Created</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((backup, index) => (
                          <tr key={index}>
                            <td className="font-monospace small">{backup.name}</td>
                            <td>{backup.size}</td>
                            <td>{new Date(backup.created).toLocaleString()}</td>
                            <td>
                              <Badge bg={backup.name.includes('daily') ? 'primary' : 
                                        backup.name.includes('weekly') ? 'info' : 'secondary'}>
                                {backup.name.includes('daily') ? 'Daily' : 
                                 backup.name.includes('weekly') ? 'Weekly' : 'Manual'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info">No backups found</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
}
