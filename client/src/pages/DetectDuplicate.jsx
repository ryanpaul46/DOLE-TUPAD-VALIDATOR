import { Container, Table, Button, Form, Spinner, Alert, Card, Row, Col } from "react-bootstrap";
import { useState } from "react";
import { Download } from "react-bootstrap-icons";
import * as XLSX from "xlsx";
import api from "../api/axios";

export default function DetectDuplicate() {
  const [file, setFile] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareResult, setCompareResult] = useState(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // Helper function to concatenate full name from individual components
  const concatenateFullName = (record) => {
    if (!record) return '';
    
    const nameParts = [
      record.first_name,
      record.middle_name,
      record.last_name,
      record.ext_name
    ].filter(part => part && part.trim().length > 0 && part.trim() !== 'null' && part.trim() !== 'undefined');
    
    return nameParts.join(' ');
  };

  // Helper function to get display name (uses existing name or concatenated)
  const getDisplayName = (record) => {
    if (!record) return '';
    
    // If there's already a name field and it's not empty, use it
    if (record.name && record.name.trim() && record.name.trim() !== 'null' && record.name.trim() !== 'undefined') {
      return record.name.trim();
    }
    
    // Otherwise, create concatenated name
    return concatenateFullName(record);
  };

  // Check if name was concatenated (no existing name field)
  const isNameConcatenated = (record) => {
    return !record.name || !record.name.trim() || record.name.trim() === 'null' || record.name.trim() === 'undefined';
  };

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

  // Define uniform headers for comparison tables
  const getUniformHeaders = () => {
    return [
      { key: 'name', excelKey: 'Name', dbKey: 'name', label: 'Full Name' },
      { key: 'first_name', excelKey: 'First Name', dbKey: 'first_name', label: 'First Name' },
      { key: 'middle_name', excelKey: 'Middle Name', dbKey: 'middle_name', label: 'Middle Name' },
      { key: 'last_name', excelKey: 'Last Name', dbKey: 'last_name', label: 'Last Name' },
      { key: 'ext_name', excelKey: 'Ext. Name', dbKey: 'ext_name', label: 'Extension' },
      { key: 'project_series', excelKey: 'Project Series', dbKey: 'project_series', label: 'Project Series' },
      { key: 'id_number', excelKey: 'ID Number', dbKey: 'id_number', label: 'ID Number' },
      { key: 'birthdate', excelKey: 'Birthdate', dbKey: 'birthdate', label: 'Birthdate' },
      { key: 'barangay', excelKey: 'Barangay', dbKey: 'barangay', label: 'Barangay' },
      { key: 'city_municipality', excelKey: 'City Municipality', dbKey: 'city_municipality', label: 'City/Municipality' },
      { key: 'province', excelKey: 'Province', dbKey: 'province', label: 'Province' },
      { key: 'district', excelKey: 'District', dbKey: 'district', label: 'District' },
      { key: 'type_of_id', excelKey: 'Type of ID', dbKey: 'type_of_id', label: 'Type of ID' },
      { key: 'id_no', excelKey: 'ID No.', dbKey: 'id_no', label: 'ID No.' },
      { key: 'contact_no', excelKey: 'Contact No.', dbKey: 'contact_no', label: 'Contact No.' },
      { key: 'type_of_beneficiary', excelKey: 'Type of Beneficiary', dbKey: 'type_of_beneficiary', label: 'Beneficiary Type' },
      { key: 'occupation', excelKey: 'Occupation', dbKey: 'occupation', label: 'Occupation' },
      { key: 'sex', excelKey: 'Sex', dbKey: 'sex', label: 'Sex' },
      { key: 'civil_status', excelKey: 'Civil Status', dbKey: 'civil_status', label: 'Civil Status' },
      { key: 'age', excelKey: 'Age', dbKey: 'age', label: 'Age' },
      { key: 'dependent', excelKey: 'Dependent', dbKey: 'dependent', label: 'Dependent' }
    ];
  };

  // Get headers that exist in the current data
  const getAvailableHeaders = () => {
    const uniformHeaders = getUniformHeaders();
    const availableHeaders = [];

    if (compareResult && (compareResult.duplicates.length > 0 || compareResult.originals.length > 0)) {
      uniformHeaders.forEach(header => {
        let hasData = false;
        
        // Check duplicates data
        if (compareResult.duplicates.length > 0) {
          compareResult.duplicates.forEach(dup => {
            if (dup.excel_row.data.hasOwnProperty(header.excelKey) ||
                dup.database_record.hasOwnProperty(header.dbKey)) {
              hasData = true;
            }
          });
        }
        
        // Check originals data
        if (!hasData && compareResult.originals.length > 0) {
          compareResult.originals.forEach(orig => {
            if (orig.data.hasOwnProperty(header.excelKey)) {
              hasData = true;
            }
          });
        }
        
        if (hasData) {
          availableHeaders.push(header);
        }
      });
    }
    
    return availableHeaders;
  };

  // Get value from record using uniform header mapping
  const getUniformValue = (record, header, isExcelData = false) => {
    const key = isExcelData ? header.excelKey : header.dbKey;
    let value = record[key];
    
    // Special handling for name field with concatenation
    if (header.key === 'name') {
      // For Excel data, check if there's a 'Name' field, otherwise concatenate
      if (isExcelData) {
        if (record['Name'] && record['Name'].trim() && record['Name'].trim() !== 'null' && record['Name'].trim() !== 'undefined') {
          value = record['Name'].trim();
        } else {
          // Create concatenated name from Excel field names
          const nameParts = [
            record['First Name'],
            record['Middle Name'],
            record['Last Name'],
            record['Ext. Name']
          ].filter(part => part && part.toString().trim().length > 0 && part.toString().trim() !== 'null' && part.toString().trim() !== 'undefined');
          value = nameParts.join(' ');
        }
      } else {
        // For database data, use existing getDisplayName logic
        value = getDisplayName(record);
      }
    }
    
    // Handle dates
    if (header.key === 'birthdate' && value) {
      try {
        const date = new Date(value);
        value = date.toLocaleDateString();
      } catch (e) {
        // Keep original value if date parsing fails
      }
    }
    
    return value !== undefined && value !== null ? String(value) : '';
  };

  // Check if Excel data should show concatenated indicator
  const isExcelNameConcatenated = (record) => {
    return !record['Name'] || !record['Name'].trim() || record['Name'].trim() === 'null' || record['Name'].trim() === 'undefined';
  };

  // Check if values are different
  const isDifferent = (dbValue, excelValue) => {
    return dbValue !== excelValue;
  };

  // Function to download duplicate comparison data as Excel
  const downloadDuplicatesAsExcel = () => {
    if (!compareResult || compareResult.duplicates.length === 0) {
      alert("No duplicate data to download");
      return;
    }

    const availableHeaders = getAvailableHeaders();
    const workbookData = [];

    // Add headers
    const headerRow = ['Source', ...availableHeaders.map(h => h.label)];
    workbookData.push(headerRow);

    // Add duplicate comparison data
    compareResult.duplicates.forEach((dup, idx) => {
      // Database row
      const dbRow = [
        'Database',
        ...availableHeaders.map(header =>
          getUniformValue(dup.database_record, header, false)
        )
      ];
      workbookData.push(dbRow);

      // Excel row
      const excelRow = [
        'Excel',
        ...availableHeaders.map(header =>
          getUniformValue(dup.excel_row.data, header, true)
        )
      ];
      workbookData.push(excelRow);

      // Empty row for spacing (optional)
      workbookData.push(['']);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(workbookData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Duplicate Comparison');

    // Generate filename with current date
    const currentDate = new Date().toISOString().slice(0, 10);
    const filename = `DOLE_TUPAD_Duplicates_${currentDate}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
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
              <Card.Header className="text-danger d-flex justify-content-between align-items-center">
                <span>Duplicate Rows Comparison</span>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={downloadDuplicatesAsExcel}
                  className="d-flex align-items-center gap-1"
                >
                  <Download size={16} />
                  Download Excel
                </Button>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-container" style={{ maxHeight: "60vh", overflow: "auto" }}>
                  <Table striped bordered hover size="sm" className="mb-0">
                    <thead className="position-sticky top-0 bg-light">
                      <tr>
                        <th>Source</th>
                        {getAvailableHeaders().map((header, idx) => (
                          <th key={idx}>{header.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.duplicates.map((dup, idx) => (
                        <>
                          {/* Database Row */}
                          <tr className="table-info">
                            <td><strong>Database</strong></td>
                            {getAvailableHeaders().map((header, colIdx) => {
                              const dbValue = getUniformValue(dup.database_record, header, false);
                              const excelValue = getUniformValue(dup.excel_row.data, header, true);
                              const isDiff = isDifferent(dbValue, excelValue);
                              
                              let displayValue = dbValue;
                              
                              return (
                                <td
                                  key={`db-${idx}-${colIdx}`}
                                  className={isDiff ? "table-warning fw-bold" : ""}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Excel Row */}
                          <tr className="table-warning">
                            <td><strong>Excel</strong></td>
                            {getAvailableHeaders().map((header, colIdx) => {
                              const dbValue = getUniformValue(dup.database_record, header, false);
                              const excelValue = getUniformValue(dup.excel_row.data, header, true);
                              const isDiff = isDifferent(dbValue, excelValue);
                              
                              let displayValue = excelValue;
                              
                              return (
                                <td
                                  key={`excel-${idx}-${colIdx}`}
                                  className={isDiff ? "table-danger fw-bold" : ""}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Empty row for spacing */}
                          <tr>
                            <td colSpan={getAvailableHeaders().length + 1} className="p-1"></td>
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
                        {getAvailableHeaders().map((header, idx) => (
                          <th key={idx}>{header.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.originals.map((row, idx) => (
                        <tr key={idx} className="table-success">
                          <td>{row.row_number}</td>
                          {getAvailableHeaders().map((header, colIdx) => {
                            const value = getUniformValue(row.data, header, true);
                            
                            return (
                              <td key={colIdx}>
                                {value}
                              </td>
                            );
                          })}
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
                      <td>
                        {getDisplayName(b)}
                      </td>
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
