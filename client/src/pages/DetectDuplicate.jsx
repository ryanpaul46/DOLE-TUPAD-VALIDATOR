import { Container, Table, Button, Form, Spinner, Alert, Card, Row, Col } from "react-bootstrap";
import { useState } from "react";
import api from "../api/axios";

export default function DetectDuplicate() {
  const [file, setFile] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareResult, setCompareResult] = useState(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleCompare = async () => {
    if (!file) {
      setError("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      setLoading(true);
      setError("");
      
      // Compare Excel file with database
      const res = await api.post("/api/compare-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setCompareResult(res.data);
    } catch (err) {
      console.error("Compare failed:", err);
      setError("Comparison failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select an Excel file");

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      await api.post("/api/upload-excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("File uploaded successfully!");
      setFile(null);

      const res = await api.get("/api/uploaded-beneficiaries");
      setBeneficiaries(res.data);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console for details.");
    }
  };

  const handleClear = () => {
    setFile(null);
    setCompareResult(null);
    setError("");
  };

  // Get all column headers from both Excel and database data
  const getAllColumnHeaders = () => {
    const headers = new Set();
    
    if (compareResult && compareResult.duplicates.length > 0) {
      // Get headers from Excel data
      compareResult.duplicates.forEach(dup => {
        Object.keys(dup.excel_row.data).forEach(header => headers.add(header));
      });
      
      // Get headers from database data
      compareResult.duplicates.forEach(dup => {
        Object.keys(dup.database_record).forEach(header => headers.add(header));
      });
    }
    
    if (compareResult && compareResult.originals.length > 0) {
      compareResult.originals.forEach(orig => {
        Object.keys(orig.data).forEach(header => headers.add(header));
      });
    }
    
    return Array.from(headers);
  };

  // Check if values are different
  const isDifferent = (dbValue, excelValue) => {
    return dbValue !== excelValue;
  };

  return (
    <Container fluid className="p-4 flex-grow-1">
      <h2>Detect Duplicate Names</h2>

      <Card className="mb-4">
        <Card.Header>Upload Excel File for Duplicate Detection</Card.Header>
        <Card.Body>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Select Excel File</Form.Label>
            <Form.Control type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          </Form.Group>
          
          <div className="d-flex gap-2 flex-wrap">
            <Button 
              onClick={handleCompare} 
              disabled={loading || !file}
              variant="primary"
            >
              {loading ? <Spinner size="sm" animation="border" /> : "Detect Duplicates"}
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={loading || !file}
              variant="secondary"
            >
              Upload to Database
            </Button>
            <Button 
              onClick={handleClear} 
              variant="outline-secondary"
            >
              Clear
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Comparison Results */}
      {compareResult && (
        <>
          <Card className="mb-4">
            <Card.Header>Comparison Summary</Card.Header>
            <Card.Body>
              <p>Total rows in Excel file: {compareResult.totalExcelRows}</p>
              <p className="text-danger">Duplicate rows found: {compareResult.totalDuplicates}</p>
              <p className="text-success">Original rows: {compareResult.totalOriginals}</p>
            </Card.Body>
          </Card>

          {/* Duplicate Rows Comparison */}
          {compareResult.duplicates.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="text-danger">Duplicate Rows Comparison</Card.Header>
              <Card.Body className="p-0">
                <div className="table-container" style={{ maxHeight: "60vh", overflow: "auto" }}>
                  <Table striped bordered hover size="sm" className="mb-0">
                    <thead className="position-sticky top-0 bg-light">
                      <tr>
                        <th>Row #</th>
                        {getAllColumnHeaders().map((header, idx) => (
                          <th key={idx}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.duplicates.map((dup, idx) => (
                        <>
                          {/* Database Row */}
                          <tr className="table-info">
                            <td>Database</td>
                            {getAllColumnHeaders().map((header, colIdx) => {
                              const dbValue = dup.database_record[header];
                              const excelValue = dup.excel_row.data[header];
                              const isDiff = isDifferent(dbValue, excelValue);
                              return (
                                <td 
                                  key={`db-${idx}-${colIdx}`} 
                                  className={isDiff ? "table-warning fw-bold" : ""}
                                >
                                  {dbValue !== undefined ? String(dbValue) : ''}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Excel Row */}
                          <tr className="table-warning">
                            <td>Excel</td>
                            {getAllColumnHeaders().map((header, colIdx) => {
                              const dbValue = dup.database_record[header];
                              const excelValue = dup.excel_row.data[header];
                              const isDiff = isDifferent(dbValue, excelValue);
                              return (
                                <td 
                                  key={`excel-${idx}-${colIdx}`} 
                                  className={isDiff ? "table-danger fw-bold" : ""}
                                >
                                  {excelValue !== undefined ? String(excelValue) : ''}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Empty row for spacing */}
                          <tr>
                            <td colSpan={getAllColumnHeaders().length + 1} className="p-1"></td>
                          </tr>
                        </>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Original Rows */}
          {compareResult.originals.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="text-success">Original Rows (Not in Database)</Card.Header>
              <Card.Body className="p-0">
                <div className="table-container" style={{ maxHeight: "40vh", overflow: "auto" }}>
                  <Table striped bordered hover size="sm" className="mb-0">
                    <thead className="position-sticky top-0 bg-light">
                      <tr>
                        <th>Row #</th>
                        {getAllColumnHeaders().map((header, idx) => (
                          <th key={idx}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.originals.map((row, idx) => (
                        <tr key={idx} className="table-success">
                          <td>{row.row_number}</td>
                          {getAllColumnHeaders().map((header, colIdx) => (
                            <td key={colIdx}>{row.data[header] !== undefined ? String(row.data[header]) : ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Uploaded Data */}
      {beneficiaries.length > 0 && (
        <Card>
          <Card.Header>Uploaded Data</Card.Header>
          <Card.Body className="p-0">
            <div className="table-container" style={{ maxHeight: "40vh", overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Project Series</th>
                    <th>ID Number</th>
                    <th>Name</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Barangay</th>
                    <th>City</th>
                    <th>Province</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b) => (
                    <tr key={b.id}>
                      <td>{b.project_series}</td>
                      <td>{b.id_number}</td>
                      <td>{b.name}</td>
                      <td>{b.first_name}</td>
                      <td>{b.last_name}</td>
                      <td>{b.barangay}</td>
                      <td>{b.city_municipality}</td>
                      <td>{b.province}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
