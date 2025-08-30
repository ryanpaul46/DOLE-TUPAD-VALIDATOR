import { Container, Button, Form, Spinner, Alert, Card, Modal, Toast } from "react-bootstrap";
import { useState, useCallback, useMemo } from "react";
import { Download } from "react-bootstrap-icons";
import * as XLSX from "xlsx";
import Fuse from "fuse.js";
import api from "../api/axios";
import VirtualizedTable from "../components/VirtualizedTable";
import ProgressTracker from "../components/ProgressTracker";
import { 
  getUniformHeaders, 
  getUniformValue, 
  getDisplayName, 
  getComprehensiveSimilarity,
  isDifferent,
  isMisspelledName
} from "../utils/duplicateUtils";

export default function AdminDuplicateDetection() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [useOptimized, setUseOptimized] = useState(false);
  const [progress, setProgress] = useState({ status: 'idle', processed: 0, total: 0, duplicatesFound: 0, percentage: 0 });
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDuplicates, setFilteredDuplicates] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("info");

  const handleFileChange = useCallback((e) => setFile(e.target.files[0]), []);

  const showNotification = useCallback((message, variant = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  }, []);

  const processOptimizedUpload = useCallback(async (formData) => {
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
    setFilteredDuplicates(optimizedRes.data.duplicates || []);
  }, []);

  const processStandardUpload = useCallback(async (res) => {
    setCompareResult(res.data);
    setProgress({
      status: 'completed',
      processed: res.data.totalExcelRows,
      total: res.data.totalExcelRows,
      duplicatesFound: res.data.totalDuplicates,
      percentage: 100
    });
    setFilteredDuplicates(res.data.duplicates || []);
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
      
      if (res.data.shouldUseOptimized) {
        setUseOptimized(true);
        setProgress(prev => ({
          ...prev,
          total: res.data.fileSize,
          status: 'processing'
        }));
        await processOptimizedUpload(formData);
      } else {
        processStandardUpload(res);
      }
    } catch (err) {
      setError("Comparison failed. Please try again.");
      setProgress(prev => ({
        ...prev,
        status: 'error'
      }));
    } finally {
      setLoading(false);
    }
  }, [file, processOptimizedUpload, processStandardUpload]);

  const handleClear = () => {
    setFile(null);
    setCompareResult(null);
    setError("");
    setUseOptimized(false);
    setSearchTerm("");
    setFilteredDuplicates([]);
    setProgress({
      status: 'idle',
      processed: 0,
      total: 0,
      duplicatesFound: 0,
      percentage: 0
    });
  };

  const getAvailableHeaders = useCallback(() => {
    const uniformHeaders = getUniformHeaders();
    
    if (!compareResult || (compareResult.duplicates.length === 0 && compareResult.originals.length === 0)) {
      return [];
    }

    return uniformHeaders.filter(header => {
      const hasDuplicateData = compareResult.duplicates.some(dup => 
        dup.excel_row.data.hasOwnProperty(header.excelKey) ||
        dup.database_record.hasOwnProperty(header.dbKey)
      );
      
      const hasOriginalData = compareResult.originals.some(orig => 
        orig.data.hasOwnProperty(header.excelKey)
      );
      
      return hasDuplicateData || hasOriginalData;
    });
  }, [compareResult]);

  // Fuzzy search using fuse.js
  const fuseSearch = useMemo(() => {
    if (!compareResult?.duplicates) return null;
    
    const searchData = compareResult.duplicates.map((dup, idx) => ({
      id: idx,
      dbName: getDisplayName(dup.database_record),
      excelName: getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true),
      duplicate: dup
    }));
    
    return new Fuse(searchData, {
      keys: ['dbName', 'excelName'],
      threshold: 0.3,
      includeScore: true
    });
  }, [compareResult]);

  // Filter duplicates based on search term
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (!term.trim() || !fuseSearch) {
      setFilteredDuplicates(compareResult?.duplicates || []);
      return;
    }
    
    const results = fuseSearch.search(term);
    setFilteredDuplicates(results.map(result => result.item.duplicate));
  }, [fuseSearch, compareResult]);

  const downloadDuplicatesAsExcel = useCallback(() => {
    if (!compareResult || compareResult.duplicates.length === 0) {
      showNotification("No duplicate data to download", "warning");
      return;
    }

    try {
      const availableHeaders = getAvailableHeaders();
      const workbookData = [];

      const headerRow = ['Source', 'Similarity %', ...availableHeaders.map(h => h.label)];
      workbookData.push(headerRow);

      compareResult.duplicates.forEach((dup) => {
        const similarity = getComprehensiveSimilarity(dup.database_record, dup.excel_row.data);
        
        const dbRow = [
          'Database',
          `${similarity}%`,
          ...availableHeaders.map(header =>
            getUniformValue(dup.database_record, header, false)
          )
        ];
        workbookData.push(dbRow);

        const excelRow = [
          'Excel',
          `${similarity}%`,
          ...availableHeaders.map(header =>
            getUniformValue(dup.excel_row.data, header, true)
          )
        ];
        workbookData.push(excelRow);
        workbookData.push(['']);
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(workbookData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Admin Duplicate Analysis');

      const currentDate = new Date().toISOString().slice(0, 10);
      const filename = `ADMIN_TUPAD_Duplicates_${currentDate}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      showNotification("Excel file downloaded successfully", "success");
    } catch (error) {
      showNotification("Failed to generate Excel file", "danger");
    }
  }, [compareResult, getAvailableHeaders, showNotification]);

  const createTableRowData = useCallback((dup, idx) => [
    {
      _source: 'Database',
      _index: idx * 2,
      _originalData: dup.database_record,
      _pairedData: dup.excel_row.data,
      _isExcel: false
    },
    {
      _source: 'Excel',
      _index: idx * 2 + 1,
      _originalData: dup.excel_row.data,
      _pairedData: dup.database_record,
      _isExcel: true
    }
  ], []);

  const duplicateTableData = useMemo(() => {
    if (!compareResult?.duplicates) return [];
    
    const duplicatesToShow = searchTerm ? filteredDuplicates : compareResult.duplicates;
    return duplicatesToShow.flatMap(createTableRowData);
  }, [compareResult, filteredDuplicates, searchTerm, createTableRowData]);

  const getColumnWidth = useCallback((key) => {
    const widthMap = {
      name: 250,
      first_name: 180,
      last_name: 180,
      project_series: 250,
      id_number: 250,
      barangay: 180,
      city_municipality: 180,
      province: 180
    };
    return widthMap[key] || 130;
  }, []);

  const duplicateTableHeaders = useMemo(() => {
    const availableHeaders = getAvailableHeaders();
    return [
      { key: '_source', label: 'Source', width: 120 },
      { key: '_similarity', label: 'Similarity %', width: 100 },
      ...availableHeaders.map(header => ({
        ...header,
        width: getColumnWidth(header.key)
      }))
    ];
  }, [getAvailableHeaders, getColumnWidth]);

  const renderSourceCell = useCallback((source) => (
    <span className={`fw-bold ${source === 'Database' ? 'text-info' : 'text-warning'}`}>
      {source || 'Unknown'}
    </span>
  ), []);

  const renderSimilarityCell = useCallback((rowData) => {
    const dbRecord = rowData._isExcel ? rowData._pairedData : rowData._originalData;
    const excelRecord = rowData._isExcel ? rowData._originalData : rowData._pairedData;
    const similarity = getComprehensiveSimilarity(dbRecord, excelRecord);
    
    const colorClass = similarity >= 80 ? 'text-success' :
                      similarity >= 60 ? 'text-warning' : 'text-danger';
    
    return (
      <span className={`fw-bold ${colorClass}`} title="Admin View: Comprehensive similarity analysis">
        {similarity}%
      </span>
    );
  }, []);

  const renderDataCell = useCallback((rowData, header) => {
    const currentValue = getUniformValue(rowData._originalData || {}, header, rowData._isExcel);
    const pairedValue = getUniformValue(rowData._pairedData || {}, header, !rowData._isExcel);
    
    if (currentValue === null || currentValue === undefined) {
      return <span className="text-muted">-</span>;
    }
    
    const isDiff = isDifferent(currentValue, pairedValue);
    const finalDisplayValue = String(currentValue);
    const isNameField = ['first_name', 'middle_name', 'last_name', 'name'].includes(header.key);
    const isMisspelled = isNameField && isDiff && isMisspelledName(currentValue, pairedValue);
    
    let className = '';
    let title = finalDisplayValue;
    
    if (isMisspelled) {
      className = 'fw-bold text-info text-decoration-underline';
      title = `${finalDisplayValue} (Admin: Misspelling detected)`;
    } else if (isDiff) {
      className = rowData._source === 'Database' ? 'fw-bold text-warning' : 'fw-bold text-danger';
    }
    
    return (
      <span className={className} title={title}>
        {finalDisplayValue}
        {isMisspelled && <span className="ms-1" title="Admin: Misspelling detected">⚠️</span>}
      </span>
    );
  }, []);

  const renderDuplicateCell = useCallback((rowData, header) => {
    if (!rowData || !header) {
      return <span className="text-muted">-</span>;
    }

    if (header.key === '_source') {
      return renderSourceCell(rowData._source);
    }

    if (header.key === '_similarity') {
      return renderSimilarityCell(rowData);
    }
    
    return renderDataCell(rowData, header);
  }, [renderSourceCell, renderSimilarityCell, renderDataCell]);

  return (
    <Container fluid className="p-4 flex-grow-1">
      <h2>Admin - Duplicate Detection & Analysis</h2>

      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">Admin Upload & Analysis</Card.Header>
        <Card.Body>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Select Excel File for Advanced Analysis</Form.Label>
            <Form.Control type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          </Form.Group>
          
          <div className="d-flex gap-2 flex-wrap">
            <Button 
              onClick={handleCompare} 
              disabled={loading || !file}
              variant="primary"
            >
              {loading ? <Spinner size="sm" animation="border" /> : "Analyze Duplicates"}
            </Button>
          
            <Button 
              onClick={handleClear} 
              variant="outline-secondary"
            >
              Clear Analysis
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
          showDetails={true}
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
            <Card.Header className="bg-info text-white">Admin Analysis Summary</Card.Header>
            <Card.Body>
              <p><strong>Total Excel rows:</strong> {compareResult.totalExcelRows}</p>
              <p className="text-danger">
                <strong>Duplicates found:</strong> {compareResult.totalDuplicates}
                {compareResult.totalDuplicates > 0 && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowDuplicatesModal(true)}
                    className="p-0 ms-2"
                  >
                    View Details
                  </Button>
                )}
              </p>
              <p className="text-success"><strong>Original records:</strong> {compareResult.totalOriginals}</p>
            </Card.Body>
          </Card>

          {compareResult.duplicates.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="text-danger">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Admin Duplicate Analysis ({compareResult.duplicates.length} duplicates)</span>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={downloadDuplicatesAsExcel}
                    className="d-flex align-items-center gap-1"
                  >
                    <Download size={16} />
                    Export Analysis
                  </Button>
                </div>
                <Form.Control
                  type="text"
                  placeholder="Admin search: Filter duplicates..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="sm"
                  className="mt-2"
                />
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

          {compareResult.originals.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="text-success">Admin View: Original Records - {compareResult.originals.length} records</Card.Header>
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

      <Modal show={showDuplicatesModal} onHide={() => setShowDuplicatesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Admin - Duplicate Analysis Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {compareResult?.duplicates?.map((dup, idx) => {
            const dbName = getDisplayName(dup.database_record);
            const excelName = getUniformValue(dup.excel_row.data, { key: 'name', excelKey: 'Name' }, true);
            const similarity = getComprehensiveSimilarity(dup.database_record, dup.excel_row.data);
            return (
              <div key={`duplicate-${idx}`} className="mb-3 p-3 border rounded">
                <div className="fw-bold text-info">Database: {dbName}</div>
                <div className="fw-bold text-warning">Excel: {excelName}</div>
                <div className="fw-bold text-success">Similarity: {similarity}%</div>
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