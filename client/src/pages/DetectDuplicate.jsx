import { Container, Table, Button, Form, Spinner, Alert, Card, Row, Col } from "react-bootstrap";
import { useState, useCallback, useMemo } from "react";
import { Download } from "react-bootstrap-icons";
import * as XLSX from "xlsx";
import api from "../api/axios";
import VirtualizedTable from "../components/VirtualizedTable";
import ProgressTracker from "../components/ProgressTracker";

export default function DetectDuplicate() {
  const [file, setFile] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [useOptimized, setUseOptimized] = useState(false);
  const [progress, setProgress] = useState({
    status: 'idle',
    processed: 0,
    total: 0,
    duplicatesFound: 0,
    percentage: 0
  });

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
      setProgress({
        status: 'processing',
        processed: 0,
        total: 0,
        duplicatesFound: 0,
        percentage: 0
      });
      
      // First try regular comparison
      const res = await api.post("/api/compare-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Check if we need to use optimized processing
      if (res.data.shouldUseOptimized) {
        console.log(`Large file detected (${res.data.fileSize} rows). Switching to optimized processing...`);
        setUseOptimized(true);
        
        // Update progress for large file processing
        setProgress(prev => ({
          ...prev,
          total: res.data.fileSize,
          status: 'processing'
        }));
        
        // Use optimized endpoint for large files
        const optimizedRes = await api.post("/api/compare-excel-optimized", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        
        setCompareResult(optimizedRes.data);
        setProgress({
          status: 'completed',
          processed: optimizedRes.data.totalExcelRows,
          total: optimizedRes.data.totalExcelRows,
          duplicatesFound: optimizedRes.data.totalDuplicates,
          percentage: 100
        });
      } else {
        // Regular processing for small files
        setCompareResult(res.data);
        setProgress({
          status: 'completed',
          processed: res.data.totalExcelRows,
          total: res.data.totalExcelRows,
          duplicatesFound: res.data.totalDuplicates,
          percentage: 100
        });
      }
    } catch (err) {
      console.error("Compare failed:", err);
      setError("Comparison failed. Please try again.");
      setProgress(prev => ({
        ...prev,
        status: 'error'
      }));
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
    setUseOptimized(false);
    setProgress({
      status: 'idle',
      processed: 0,
      total: 0,
      duplicatesFound: 0,
      percentage: 0
    });
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
    if (!record || !header) return '';
    
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
    
    // Return empty string for null/undefined, but preserve other falsy values like 0
    if (value === null || value === undefined) {
      return '';
    }
    
    return String(value);
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

  // Prepare data for virtualized duplicate comparison table
  const duplicateTableData = useMemo(() => {
    if (!compareResult || !compareResult.duplicates) return [];
    
    const data = [];
    compareResult.duplicates.forEach((dup, idx) => {
      // Database record - store original data separately to avoid conflicts
      data.push({
        _source: 'Database',
        _index: idx * 2,
        _originalData: dup.database_record,
        _pairedData: dup.excel_row.data,
        _isExcel: false
      });
      
      // Excel record - store original data separately to avoid conflicts
      data.push({
        _source: 'Excel',
        _index: idx * 2 + 1,
        _originalData: dup.excel_row.data,
        _pairedData: dup.database_record,
        _isExcel: true
      });
    });
    return data;
  }, [compareResult]);

  // Headers for virtualized duplicate table with improved widths
  const duplicateTableHeaders = useMemo(() => {
    const availableHeaders = getAvailableHeaders();
    return [
      { key: '_source', label: 'Source', width: 120 },
      ...availableHeaders.map(header => ({
        ...header,
        width: header.key === 'name' ? 250 :
               header.key === 'first_name' || header.key === 'last_name' ? 180 :
               header.key === 'project_series' || header.key === 'id_number' ? 160 :
               header.key === 'barangay' || header.key === 'city_municipality' || header.key === 'province' ? 180 :
               130
      }))
    ];
  }, [compareResult]);

  // Custom cell renderer for duplicate table
  const renderDuplicateCell = useCallback((rowData, header, rowIndex, cellIndex) => {
    if (!rowData || !header) {
      return <span className="text-muted">-</span>;
    }

    if (header.key === '_source') {
      return (
        <span className={`fw-bold ${rowData._source === 'Database' ? 'text-info' : 'text-warning'}`}>
          {rowData._source || 'Unknown'}
        </span>
      );
    }
    
    // Get the value from the appropriate data source
    const currentValue = getUniformValue(rowData._originalData || {}, header, rowData._isExcel);
    const pairedValue = getUniformValue(rowData._pairedData || {}, header, !rowData._isExcel);
    
    // Check if values are different
    const isDiff = isDifferent(currentValue, pairedValue);
    
    // Handle display of values - server now returns cleaned data with empty strings converted to null
    let displayValue = currentValue;
    
    // Only show "-" for null/undefined values (server converts empty strings to null)
    if (displayValue === null || displayValue === undefined) {
      return <span className="text-muted">-</span>;
    }
    
    // Convert to string for display
    const finalDisplayValue = String(displayValue);
    
    return (
      <span
        className={isDiff ? (rowData._source === 'Database' ? 'fw-bold text-warning' : 'fw-bold text-danger') : ''}
        title={finalDisplayValue}
      >
        {finalDisplayValue}
      </span>
    );
  }, [getUniformValue, isDifferent]);

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
              onClick={handleClear} 
              variant="outline-secondary"
            >
              Clear
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Progress Tracker */}
      {(loading || progress.status !== 'idle') && (
        <ProgressTracker
          progress={progress.percentage}
          total={progress.total}
          processed={progress.processed}
          duplicatesFound={progress.duplicatesFound}
          status={progress.status}
          showDetails={true}
        />
      )}

      {/* Loading / Error */}
      {loading && !progress.total && (
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
                <span>Duplicate Rows Comparison ({compareResult.duplicates.length} duplicates found)</span>
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
                <VirtualizedTable
                  data={duplicateTableData}
                  headers={duplicateTableHeaders}
                  height={500}
                  rowHeight={50}
                  renderCell={renderDuplicateCell}
                  className="border-0"
                />
              </Card.Body>
            </Card>
          )}

          {/* Original Rows */}
          {compareResult.originals.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="text-success">Original Rows (Not in Database) - {compareResult.originals.length} records</Card.Header>
              <Card.Body className="p-0">
                <VirtualizedTable
                  data={compareResult.originals.map(row => ({
                    ...row.data,
                    _row_number: row.row_number
                  }))}
                  headers={[
                    { key: '_row_number', label: 'Row #', width: 80 },
                    ...getAvailableHeaders().map(header => ({
                      ...header,
                      width: header.key === 'name' ? 200 : 150
                    }))
                  ]}
                  height={400}
                  rowHeight={45}
                  renderCell={(rowData, header, rowIndex, cellIndex) => {
                    if (header.key === '_row_number') {
                      return <span className="fw-bold text-success">{rowData._row_number}</span>;
                    }
                    const value = getUniformValue(rowData, header, true);
                    return <span title={value}>{value}</span>;
                  }}
                  className="border-0"
                />
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Uploaded Data */}
      {beneficiaries.length > 0 && (
        <Card>
          <Card.Header>Uploaded Data - {beneficiaries.length} records</Card.Header>
          <Card.Body className="p-0">
            <VirtualizedTable
              data={beneficiaries}
              headers={[
                { key: 'project_series', label: 'Project Series', width: 150 },
                { key: 'id_number', label: 'ID Number', width: 120 },
                { key: 'name', label: 'Name', width: 200 },
                { key: 'first_name', label: 'First Name', width: 150 },
                { key: 'last_name', label: 'Last Name', width: 150 },
                { key: 'barangay', label: 'Barangay', width: 150 },
                { key: 'city_municipality', label: 'City', width: 150 },
                { key: 'province', label: 'Province', width: 150 }
              ]}
              height={400}
              rowHeight={45}
              renderCell={(rowData, header, rowIndex, cellIndex) => {
                if (header.key === 'name') {
                  return <span title={getDisplayName(rowData)}>{getDisplayName(rowData)}</span>;
                }
                const value = rowData[header.key] || '';
                return <span title={value}>{value}</span>;
              }}
              className="border-0"
            />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
