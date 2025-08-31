import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Container, Button, Form, Spinner, Alert, Table, Pagination, Card, Row, Col, InputGroup, Badge, Modal } from "react-bootstrap";
import { Upload, Search, ExclamationTriangle, CheckCircle } from "react-bootstrap-icons";
import api from "../api/axios";
import { detectDuplicatesUnified } from "../utils/unifiedDuplicateDetection";
import { getDisplayName } from "../utils/nameUtils";
import { getUniformValue } from "../utils/dataUtils";

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

  // Smart upload with scanning states
  const [scanFile, setScanFile] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [duplicateRemarks, setDuplicateRemarks] = useState("");

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

  // Enhanced smart upload with unified duplicate detection
  const handleScanUpload = async () => {
    if (!scanFile) {
      setError("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("excelFile", scanFile);

    try {
      setScanning(true);
      setError("");
      
      // Use existing compare-excel endpoint to get Excel data and existing duplicates
      const compareResponse = await api.post("/api/compare-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Extract Excel data from the response
      const excelData = compareResponse.data.originals?.map(orig => orig.data) || [];
      const existingDuplicates = compareResponse.data.duplicates || [];
      
      // Use unified duplicate detection for better misspelling detection on all Excel data
      const allExcelData = [
        ...excelData,
        ...existingDuplicates.map(dup => dup.excel_row.data)
      ];
      
      const enhancedDuplicates = detectDuplicatesUnified(allExcelData, data, 60);
      
      // Separate new records (not duplicates)
      const duplicateExcelRows = new Set(enhancedDuplicates.map(dup => dup.excel_row.row_number));
      const newRecords = allExcelData.filter((_, index) => !duplicateExcelRows.has(index + 1));
      
      setScanResults({
        duplicates: enhancedDuplicates,
        newRecords: newRecords,
        totalExcelRows: allExcelData.length,
        totalDuplicates: enhancedDuplicates.length,
        totalNewRecords: newRecords.length
      });
      
      setShowScanModal(true);
    } catch (err) {
      console.error("Scan failed:", err);
      setError("File scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  // Upload only new records after confirmation
  const handleUploadNewRecords = async () => {
    if (!scanResults || !scanResults.newRecords) return;

    try {
      setUploading(true);
      await api.post("/api/upload-new-records", {
        newRecords: scanResults.newRecords
      });
      
      // Refresh data and close modal
      await fetchData();
      setShowScanModal(false);
      setScanResults(null);
      setScanFile(null);
      setError("");
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Close scan modal
  const handleCloseScanModal = () => {
    setShowScanModal(false);
    setScanResults(null);
    setScanFile(null);
  };

  // Upload selected duplicates (Excel data)
  const handleUploadSelectedDuplicates = async () => {
    if (selectedDuplicates.length === 0) return;

    const selectedExcelRecords = selectedDuplicates.map(idx => {
      const duplicate = scanResults.duplicates[idx];
      const record = { ...duplicate.excel_row.data };
      // Append remarks and similarity info
      record.remarks = `${duplicateRemarks} (Similarity: ${duplicate.similarity_score}%)`;
      return record;
    });

    try {
      setUploading(true);
      await api.post("/api/upload-new-records", {
        newRecords: selectedExcelRecords
      });
      
      await fetchData();
      setShowDuplicatesModal(false);
      setSelectedDuplicates([]);
      setDuplicateRemarks("");
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Toggle duplicate selection
  const toggleDuplicateSelection = (index) => {
    setSelectedDuplicates(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
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
            {/* Smart Upload with Duplicate Scanning */}
            <div className="mb-3">
              <h6 className="text-success mb-2">
                <Upload size={16} className="me-1" />
                Smart Upload (Recommended)
              </h6>
              <p className="text-muted small mb-2">
                Upload Excel file with enhanced misspelling detection and duplicate scanning
              </p>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <Form.Control
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setScanFile(e.target.files[0])}
                  style={{ maxWidth: "300px" }}
                />
                <Button
                  variant="success"
                  onClick={handleScanUpload}
                  disabled={scanning || !scanFile}
                  size="sm"
                >
                  {scanning ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-1" />
                      Scanning for duplicates...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="me-1" />
                      Scan & Upload
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Scan Results Modal */}
            <Modal show={showScanModal} onHide={handleCloseScanModal} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Upload Scan Results</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {scanResults && (
                  <>
                    <div className="mb-3">
                      <h6>Scan Summary:</h6>
                      <ul className="list-unstyled">
                        <li><Badge bg="primary">{scanResults.totalExcelRows}</Badge> Total rows in Excel</li>
                        <li><Badge bg="success">{scanResults.totalNewRecords}</Badge> New records (will be uploaded)</li>
                        <li><Badge bg="warning">{scanResults.totalDuplicates}</Badge> Possible duplicates found</li>
                      </ul>
                    </div>
                    
                    {scanResults.totalDuplicates > 0 && (
                      <div className="mb-3">
                        <h6 className="text-warning">Possible Duplicates Detected:</h6>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {scanResults.duplicates.map((dup, idx) => (
                            <div key={idx} className="border rounded p-2 mb-2 bg-light">
                              <Row>
                                <Col md={5}>
                                  <small className="text-primary fw-bold">Excel:</small>
                                  <div className="font-monospace small">{dup.excel_name}</div>
                                </Col>
                                <Col md={2} className="text-center">
                                  <Badge bg={dup.similarity_score >= 80 ? 'success' : dup.similarity_score >= 60 ? 'warning' : 'danger'}>
                                    {dup.similarity_score}%
                                  </Badge>
                                </Col>
                                <Col md={5}>
                                  <small className="text-info fw-bold">Database:</small>
                                  <div className="font-monospace small">{dup.db_name}</div>
                                </Col>
                              </Row>
                            </div>
                          ))}
                        </div>
                        <Button 
                          variant="outline-warning" 
                          size="sm" 
                          onClick={() => setShowDuplicatesModal(true)}
                          className="mt-2"
                        >
                          Manage Duplicates
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseScanModal}>
                  Cancel
                </Button>
                {scanResults?.totalNewRecords > 0 && (
                  <Button 
                    variant="success" 
                    onClick={handleUploadNewRecords}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-1" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${scanResults.totalNewRecords} New Records`
                    )}
                  </Button>
                )}
              </Modal.Footer>
            </Modal>

            {/* Duplicates Management Modal */}
            <Modal show={showDuplicatesModal} onHide={() => setShowDuplicatesModal(false)} size="xl">
              <Modal.Header closeButton>
                <Modal.Title>Manage Duplicate Records</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted">Select duplicates to upload anyway (they will be marked with similarity scores):</p>
                
                <Form.Group className="mb-3">
                  <Form.Label>Remarks for selected duplicates:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={duplicateRemarks}
                    onChange={(e) => setDuplicateRemarks(e.target.value)}
                    placeholder="Add remarks for why these duplicates should be uploaded..."
                  />
                </Form.Group>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {scanResults?.duplicates?.map((dup, idx) => (
                    <div key={idx} className="border rounded p-3 mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`duplicate-${idx}`}
                        label={`Upload this duplicate (${dup.similarity_score}% match)`}
                        checked={selectedDuplicates.includes(idx)}
                        onChange={() => toggleDuplicateSelection(idx)}
                        className="mb-2"
                      />
                      <Row>
                        <Col md={5}>
                          <small className="text-primary fw-bold">Excel Record:</small>
                          <div className="font-monospace small bg-light p-2 rounded">
                            {dup.excel_name}
                          </div>
                        </Col>
                        <Col md={2} className="text-center d-flex align-items-center justify-content-center">
                          <Badge bg={dup.similarity_score >= 80 ? 'success' : dup.similarity_score >= 60 ? 'warning' : 'danger'} className="fs-6">
                            {dup.similarity_score}%
                          </Badge>
                        </Col>
                        <Col md={5}>
                          <small className="text-info fw-bold">Database Match:</small>
                          <div className="font-monospace small bg-light p-2 rounded">
                            {dup.db_name}
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDuplicatesModal(false)}>
                  Close
                </Button>
                {selectedDuplicates.length > 0 && (
                  <Button 
                    variant="warning" 
                    onClick={handleUploadSelectedDuplicates}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-1" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${selectedDuplicates.length} Selected Duplicates`
                    )}
                  </Button>
                )}
              </Modal.Footer>
            </Modal>

            <hr />

            {/* Direct Upload */}
            <div>
              <h6 className="text-warning mb-2">
                <ExclamationTriangle size={16} className="me-1" />
                Direct Upload (No Duplicate Check)
              </h6>
              <p className="text-muted small mb-2">
                Upload Excel file directly without duplicate scanning
              </p>
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

      {/* Scan Results Modal */}
      <Modal show={showScanModal} onHide={handleCloseScanModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Search size={20} className="me-2" />
            Duplicate Scan Results
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {scanResults && (
            <>
              <div className="mb-4">
                <h5>Scan Summary</h5>
                <Row>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h3 className="text-primary">{scanResults.totalRows}</h3>
                        <small className="text-muted">Total Rows Scanned</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h3 className="text-danger">{scanResults.duplicatesFound}</h3>
                        <small className="text-muted">Duplicates Found</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h3 className="text-success">{scanResults.newRecordsFound}</h3>
                        <small className="text-muted">New Records</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>

              {scanResults.duplicatesFound > 0 && (
                <Alert variant="warning">
                  <ExclamationTriangle size={16} className="me-1" />
                  <strong>Duplicates Found:</strong> {scanResults.duplicatesFound} records already exist in the database and will be skipped.
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowDuplicatesModal(true)}
                    className="p-0 ms-2"
                  >
                    View Names
                  </Button>
                </Alert>
              )}

              {scanResults.newRecordsFound > 0 && (
                <Alert variant="success">
                  <CheckCircle size={16} className="me-1" />
                  <strong>New Records:</strong> {scanResults.newRecordsFound} new records ready to be added to the database.
                </Alert>
              )}

              {scanResults.newRecordsFound === 0 && (
                <Alert variant="info">
                  No new records found. All entries already exist in the database.
                </Alert>
              )}

              {/* Sample of new records */}
              {scanResults.newRecords && scanResults.newRecords.length > 0 && (
                <div className="mt-3">
                  <h6>Sample of New Records (First 5):</h6>
                  <div className="table-responsive" style={{ maxHeight: "300px", overflow: "auto" }}>
                    <Table striped bordered size="sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Project Series</th>
                          <th>Barangay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResults.newRecords.slice(0, 5).map((record, idx) => (
                          <tr key={idx}>
                            <td>{record.finalName || '-'}</td>
                            <td>{record["First Name"] || '-'}</td>
                            <td>{record["Last Name"] || '-'}</td>
                            <td>{record["Project Series"] || '-'}</td>
                            <td>{record["Barangay"] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {scanResults.newRecords.length > 5 && (
                      <small className="text-muted">... and {scanResults.newRecords.length - 5} more records</small>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseScanModal}>
            Cancel
          </Button>
          {scanResults && scanResults.newRecordsFound > 0 && (
            <Button
              variant="success"
              onClick={handleUploadNewRecords}
              disabled={uploading}
            >
              {uploading ? <Spinner size="sm" animation="border" className="me-1" /> : null}
              Upload {scanResults.newRecordsFound} New Records
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Duplicate Names Modal */}
      <Modal show={showDuplicatesModal} onHide={() => setShowDuplicatesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Excel Records to Upload</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            Select Excel records you want to upload despite being duplicates. The checkbox selects the Excel data for upload.
          </Alert>
          
          <div className="mb-3">
            <Form.Group>
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={duplicateRemarks}
                onChange={(e) => setDuplicateRemarks(e.target.value)}
                placeholder="Add remarks for selected Excel records..."
              />
            </Form.Group>
          </div>
          
          {scanResults?.duplicates?.map((dup, idx) => {
            const dbName = dup.database_record?.name || 
              [dup.database_record?.first_name, dup.database_record?.middle_name, dup.database_record?.last_name, dup.database_record?.ext_name]
                .filter(Boolean).join(' ');
            const excelName = dup.excel_record?.finalName || dup.excel_record?.Name || 
              [dup.excel_record?.['First Name'], dup.excel_record?.['Middle Name'], dup.excel_record?.['Last Name'], dup.excel_record?.['Ext. Name']]
                .filter(Boolean).join(' ');
            return (
              <div key={idx} className="mb-3 p-3 border rounded">
                <div className="d-flex align-items-start">
                  <Form.Check
                    type="checkbox"
                    checked={selectedDuplicates.includes(idx)}
                    onChange={() => toggleDuplicateSelection(idx)}
                    className="me-3 mt-1"
                    title="Select this Excel record for upload"
                  />
                  <div className="flex-grow-1">
                    <div className="text-muted small">Existing in Database:</div>
                    <div className="fw-bold text-info mb-2">{dbName}</div>
                    <div className="text-muted small">From Excel (will be uploaded if selected):</div>
                    <div className="fw-bold text-warning">{excelName}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDuplicatesModal(false)}>
            Close
          </Button>
          {selectedDuplicates.length > 0 && (
            <Button
              variant="primary"
              onClick={handleUploadSelectedDuplicates}
              disabled={uploading}
            >
              {uploading ? <Spinner size="sm" animation="border" className="me-1" /> : null}
              Upload {selectedDuplicates.length} Excel Records
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
