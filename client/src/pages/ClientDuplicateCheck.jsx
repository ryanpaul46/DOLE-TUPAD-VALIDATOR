import { Container, Button, Form, Spinner, Alert, Card, Modal, Toast } from "react-bootstrap";
import { useState, useCallback, useMemo } from "react";
import { Download } from "react-bootstrap-icons";
import * as XLSX from "xlsx";
import api from "../api/axios";
import VirtualizedTable from "../components/VirtualizedTable";
import ProgressTracker from "../components/ProgressTracker";
import { 
  getUniformHeaders, 
  getUniformValue, 
  getDisplayName, 
  getComprehensiveSimilarity,
  isDifferent
} from "../utils/duplicateUtils";

const DUPLICATE_TABLE_HEADERS = [
  { key: 'dbName', label: 'Database Name', width: 250 },
  { key: 'excelName', label: 'Excel Name', width: 250 },
  { key: 'similarity', label: 'Match %', width: 100 }
];

export default function ClientDuplicateCheck() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [progress, setProgress] = useState({ status: 'idle', processed: 0, total: 0, duplicatesFound: 0, percentage: 0 });
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("info");

  const handleFileChange = useCallback((e) => setFile(e.target.files[0]), []);

  const showNotification = useCallback((message, variant = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  }, []);

  const handleCompare = useCallback(async () => {
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
      
      const res = await api.post("/api/compare-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setCompareResult(res.data);
      setProgress({
        status: 'completed',
        processed: res.data.totalExcelRows,
        total: res.data.totalExcelRows,
        duplicatesFound: res.data.totalDuplicates,
        percentage: 100
      });
    } catch (err) {
      setError("Comparison failed. Please try again.");
      setProgress(prev => ({
        ...prev,
        status: 'error'
      }));
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleClear = useCallback(() => {
    setFile(null);
    setCompareResult(null);
    setError("");
    setProgress({
      status: 'idle',
      processed: 0,
      total: 0,
      duplicatesFound: 0,
      percentage: 0
    });
  }, []);

  const getAvailableHeaders = useMemo(() => {
    const uniformHeaders = getUniformHeaders();
    
    if (!compareResult?.duplicates?.length) return [];
    
    return uniformHeaders.filter(header => 
      compareResult.duplicates.some(dup => 
        dup.excel_row.data.hasOwnProperty(header.excelKey) ||
        dup.database_record.hasOwnProperty(header.dbKey)
      )
    );
  }, [compareResult]);

  const downloadDuplicatesAsExcel = useCallback(() => {
    if (!compareResult?.duplicates?.length) {
      showNotification("No duplicate data to download", "warning");
      return;
    }

    try {
      const workbookData = [];
      const headerRow = ['Database Name', 'Excel Name', 'Match Confidence'];
      workbookData.push(headerRow);

      compareResult.duplicates.forEach((dup) => {
        const dbName = getDisplayName(dup.database_record);
        const excelName = getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true);
        const similarity = getComprehensiveSimilarity(dup.database_record, dup.excel_row.data);
        
        const row = [dbName, excelName, `${similarity}%`];
        workbookData.push(row);
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(workbookData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Duplicate Check Results');

      const currentDate = new Date().toISOString().slice(0, 10);
      const filename = `Duplicate_Check_${currentDate}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      showNotification("Results downloaded successfully", "success");
    } catch (error) {
      showNotification("Failed to download results", "danger");
    }
  }, [compareResult, showNotification]);

  // Prepare simplified data for client view
  const duplicateTableData = useMemo(() => {
    if (!compareResult || !compareResult.duplicates) return [];
    
    return compareResult.duplicates.map((dup, idx) => ({
      _index: idx,
      dbName: getDisplayName(dup.database_record),
      excelName: getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true),
      similarity: getComprehensiveSimilarity(dup.database_record, dup.excel_row.data),
      dbRecord: dup.database_record,
      excelRecord: dup.excel_row.data
    }));
  }, [compareResult]);



  // Simple cell renderer for client view
  const renderDuplicateCell = useCallback((rowData, header) => {
    if (!rowData || !header) {
      return <span className="text-muted">-</span>;
    }

    if (header.key === 'similarity') {
      const similarity = rowData.similarity;
      return (
        <span className={`fw-bold ${
          similarity >= 80 ? 'text-success' :
          similarity >= 60 ? 'text-warning' : 'text-danger'
        }`}>
          {similarity}%
        </span>
      );
    }
    
    const value = rowData[header.key] || '';
    return <span title={value}>{value}</span>;
  }, []);

  return (
    <Container fluid className="p-4 flex-grow-1">
      <h2>Duplicate Check</h2>

      <Card className="mb-4">
        <Card.Header>Upload Excel File to Check for Duplicates</Card.Header>
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
              {loading ? <Spinner size="sm" animation="border" /> : "Check Duplicates"}
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

      {(loading || progress.status !== 'idle') && (
        <ProgressTracker
          progress={progress.percentage}
          total={progress.total}
          processed={progress.processed}
          duplicatesFound={progress.duplicatesFound}
          status={progress.status}
          showDetails={false}
        />
      )}

      {loading && !progress.total && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}

      {compareResult && (
        <>
          <Card className="mb-4">
            <Card.Header>Check Results</Card.Header>
            <Card.Body>
              <p>Total rows checked: {compareResult.totalExcelRows}</p>
              <p className="text-danger">
                Potential duplicates found: {compareResult.totalDuplicates}
                {compareResult.totalDuplicates > 0 && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowDuplicatesModal(true)}
                    className="p-0 ms-2"
                  >
                    View List
                  </Button>
                )}
              </p>
              <p className="text-success">Unique records: {compareResult.totalOriginals}</p>
            </Card.Body>
          </Card>

          {compareResult.duplicates.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="text-danger">
                <div className="d-flex justify-content-between align-items-center">
                  <span>Potential Duplicates ({compareResult.duplicates.length} found)</span>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={downloadDuplicatesAsExcel}
                    className="d-flex align-items-center gap-1"
                  >
                    <Download size={16} />
                    Download Results
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <VirtualizedTable
                  data={duplicateTableData}
                  headers={DUPLICATE_TABLE_HEADERS}
                  height={400}
                  rowHeight={50}
                  renderCell={renderDuplicateCell}
                  className="border-0"
                />
              </Card.Body>
            </Card>
          )}

          {compareResult.duplicates.length === 0 && (
            <Alert variant="success">
              <h5>Great news!</h5>
              <p>No duplicates found in your Excel file. All records appear to be unique.</p>
            </Alert>
          )}
        </>
      )}

      <Modal show={showDuplicatesModal} onHide={() => setShowDuplicatesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Potential Duplicates Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {compareResult?.duplicates?.map((dup, idx) => {
            const dbName = getDisplayName(dup.database_record);
            const excelName = getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true);
            const similarity = getComprehensiveSimilarity(dup.database_record, dup.excel_row.data);
            return (
              <div key={`duplicate-${idx}`} className="mb-3 p-3 border rounded">
                <div className="fw-bold text-info">Database: {dbName}</div>
                <div className="fw-bold text-warning">Your Excel: {excelName}</div>
                <div className={`fw-bold ${
                  similarity >= 80 ? 'text-success' :
                  similarity >= 60 ? 'text-warning' : 'text-danger'
                }`}>
                  Match Confidence: {similarity}%
                </div>
              </div>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDuplicatesModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide bg={toastVariant}>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </div>
    </Container>
  );
}