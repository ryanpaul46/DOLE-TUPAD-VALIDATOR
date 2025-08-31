import { Container, Button, Form, Spinner, Alert, Card, Modal } from "react-bootstrap";
import { useState, useCallback } from "react";
import api from "../api/axios";
import ProgressTracker from "../components/ProgressTracker";
import DuplicateTable from "../components/DuplicateTable";
import OriginalsTable from "../components/OriginalsTable";
import PossibleDuplicatesCard from "../components/PossibleDuplicatesCard";
import { useFileComparison } from "../hooks/useFileComparison";
import { useUnifiedDuplicateDetection } from "../hooks/useUnifiedDuplicateDetection";
import { getDisplayName } from "../utils/nameUtils";
import { getUniformValue } from "../utils/dataUtils";
import { downloadDuplicatesAsExcel } from "../utils/excelUtils";


export default function DetectDuplicate() {
  const [file, setFile] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [useSimpleAlgorithm, setUseSimpleAlgorithm] = useState(false);
  
  const { loading, error, compareResult, progress, compareFile, clearResults: clearFileResults } = useFileComparison();
  const {
    duplicates,
    filteredDuplicates,
    searchTerm,
    similarityThreshold,
    isProcessing,
    detectDuplicates,
    searchDuplicates,
    updateThreshold,
    clearResults: clearDuplicateResults
  } = useUnifiedDuplicateDetection();

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleCompare = async () => {
    const result = await compareFile(file);
    
    if (result?.duplicates) {
      const excelData = result.duplicates.map(dup => dup.excel_row.data);
      const dbRecords = result.duplicates.map(dup => dup.database_record);
      
      if (useSimpleAlgorithm) {
        // Use simple string-similarity algorithm
        const threshold = similarityThreshold / 100; // Convert to 0-1 range
        const simpleDuplicates = findPossibleDuplicates(excelData, dbRecords, threshold);
        // Manually set the duplicates for display
        clearDuplicateResults();
        // Note: This bypasses the hook, but works for demonstration
        duplicates.splice(0, duplicates.length, ...simpleDuplicates);
      } else {
        // Use unified detection (Levenshtein + Fuse.js)
        await detectDuplicates(excelData, dbRecords, similarityThreshold);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select an Excel file");

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      await api.post("/api/upload-excel", formData, {
        params: {
          selectedDuplicates: selectedDuplicates.map(d => d.id),
          remarks: remarks
        },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("File uploaded successfully!");
      setFile(null);

      const res = await api.get("/api/uploaded-beneficiaries");
      setBeneficiaries(res.data);
    } catch (err) {
      console.error("Upload failed:");
      alert("Upload failed. Please try again.");
    }
  };

  const handleClear = () => {
    setFile(null);
    clearFileResults();
    clearDuplicateResults();
  };

  // Create unified comparison result for compatibility
  const unifiedCompareResult = {
    ...compareResult,
    duplicates: duplicates,
    totalDuplicates: duplicates.length
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
          
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="algorithm-switch"
              label={useSimpleAlgorithm ? "Simple Algorithm (String Similarity)" : "Advanced Algorithm (Levenshtein + Fuse.js)"}
              checked={useSimpleAlgorithm}
              onChange={(e) => setUseSimpleAlgorithm(e.target.checked)}
            />
            <Form.Text className="text-muted">
              {useSimpleAlgorithm ? "Fast, basic matching" : "Comprehensive misspelling detection"}
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Similarity Threshold: {similarityThreshold}%</Form.Label>
            <Form.Range
              min={50}
              max={100}
              value={similarityThreshold}
              onChange={(e) => updateThreshold(parseInt(e.target.value))}
            />
            <Form.Text className="text-muted">
              Higher values = stricter matching (fewer duplicates)
            </Form.Text>
          </Form.Group>
          
          <div className="d-flex gap-2 flex-wrap">
            <Button 
              onClick={handleCompare} 
              disabled={loading || isProcessing || !file}
              variant="primary"
            >
              {(loading || isProcessing) ? <Spinner size="sm" animation="border" /> : "Detect Duplicates"}
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
              <p className="text-danger">
                Duplicate rows found: {duplicates.length}
                {duplicates.length > 0 && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowDuplicatesModal(true)}
                    className="p-0 ms-2"
                  >
                    View Names
                  </Button>
                )}
              </p>
              <p className="text-success">Original rows: {compareResult.totalOriginals}</p>
            </Card.Body>
          </Card>

          <PossibleDuplicatesCard duplicates={duplicates} />

          <DuplicateTable
            compareResult={unifiedCompareResult}
            searchTerm={searchTerm}
            onSearch={searchDuplicates}
            filteredDuplicates={filteredDuplicates}
            onDownload={() => downloadDuplicatesAsExcel(unifiedCompareResult)}
          />

          <OriginalsTable compareResult={compareResult} />
        </>
      )}


      {/* Duplicate Names Modal */}
      <Modal show={showDuplicatesModal} onHide={() => setShowDuplicatesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Duplicate Names Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {duplicates?.map((dup, idx) => (
            <div key={idx} className="mb-3 p-3 border rounded">
              <div className="fw-bold text-info">Database: {dup.db_name}</div>
              <div className="fw-bold text-warning">Excel: {dup.excel_name}</div>
              <div className="fw-bold text-success">Similarity: {dup.similarity_score}%</div>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDuplicatesModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
        
  );
}
