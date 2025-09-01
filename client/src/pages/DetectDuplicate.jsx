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
import { getMatchTypeStats, filterByMatchType, getReviewZoneItems, THRESHOLDS } from "../utils/unifiedDuplicateDetection";
import { testSimilarity } from "../utils/testSimilarity";


export default function DetectDuplicate() {
  const [file, setFile] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [useSimpleAlgorithm, setUseSimpleAlgorithm] = useState(false);
  const [selectedMatchType, setSelectedMatchType] = useState('ALL');
  
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
    
    if (result) {
      // Get ALL Excel data and ALL database records for fuzzy matching
      const formData = new FormData();
      formData.append('excelFile', file);
      
      try {
        // Read Excel data
        const excelResponse = await api.post('/api/get-excel-data', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Get all database records
        const dbResponse = await api.get('/api/uploaded-beneficiaries');
        
        const excelData = excelResponse.data.excelData || [];
        const dbRecords = dbResponse.data || [];
        
        if (excelData.length > 0 && dbRecords.length > 0) {
          // Use unified detection for fuzzy matching
          await detectDuplicates(excelData, dbRecords, similarityThreshold);
        } else {
          // Fallback to server results if API calls fail
          const serverDuplicates = result.duplicates || [];
          clearDuplicateResults();
          duplicates.splice(0, duplicates.length, ...serverDuplicates);
        }
      } catch (error) {
        console.error('Client-side detection failed, using server results:', error);
        // Fallback to server results
        const serverDuplicates = result.duplicates || [];
        clearDuplicateResults();
        duplicates.splice(0, duplicates.length, ...serverDuplicates);
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
    setSelectedMatchType('ALL');
  };

  // Get match statistics
  const matchStats = duplicates.length > 0 ? getMatchTypeStats(duplicates) : null;
  
  // Filter duplicates by selected match type
  const getFilteredDuplicates = () => {
    if (selectedMatchType === 'ALL') return duplicates;
    if (selectedMatchType === 'REVIEW_ZONE') return getReviewZoneItems(duplicates);
    return filterByMatchType(duplicates, selectedMatchType);
  };

  // Create unified comparison result for compatibility
  const unifiedCompareResult = {
    ...compareResult,
    duplicates: getFilteredDuplicates(),
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
              min={60}
              max={100}
              value={similarityThreshold}
              onChange={(e) => updateThreshold(parseInt(e.target.value))}
            />
            <Form.Text className="text-muted">
              Duplicate: ≥80% | Review Zone: 60-79% | No Match: &lt;60%
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
            
            <Button 
              onClick={() => {
                const results = testSimilarity();
                console.log('Test Results:', results);
                alert(`Test Results:\nFLORIAD vs FLORIDA: ${results.singleName}%\nFull names: ${results.fullName}%\nDuplicates found: ${results.duplicateResults.length}`);
              }} 
              variant="info"
              size="sm"
            >
              Test Algorithm
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
            <Card.Header>3-Tier Detection Summary</Card.Header>
            <Card.Body>
              <p>Total rows in Excel file: {compareResult.totalExcelRows}</p>
              
              {matchStats && (
                <div className="row mb-3">
                  <div className="col-md-3">
                    <div className="text-center p-2 border rounded bg-danger text-white">
                      <div className="fw-bold">{matchStats.DUPLICATE}</div>
                      <small>Duplicates (≥80%)</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-2 border rounded bg-warning text-dark">
                      <div className="fw-bold">{matchStats.POSSIBLE_MISMATCH}</div>
                      <small>Possible Matches (60-79%)</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-2 border rounded bg-info text-white">
                      <div className="fw-bold">{matchStats.REVIEW_ZONE}</div>
                      <small>Review Zone</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center p-2 border rounded bg-success text-white">
                      <div className="fw-bold">{compareResult.totalOriginals}</div>
                      <small>Original Records</small>
                    </div>
                  </div>
                </div>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Filter by Match Type:</Form.Label>
                <Form.Select 
                  value={selectedMatchType} 
                  onChange={(e) => setSelectedMatchType(e.target.value)}
                >
                  <option value="ALL">All Matches ({duplicates.length})</option>
                  {matchStats && (
                    <>
                      <option value="DUPLICATE">Duplicates ({matchStats.DUPLICATE})</option>
                      <option value="POSSIBLE_MISMATCH">Possible Matches ({matchStats.POSSIBLE_MISMATCH})</option>
                      <option value="REVIEW_ZONE">Review Zone ({matchStats.REVIEW_ZONE})</option>
                    </>
                  )}
                </Form.Select>
              </Form.Group>
              
              {duplicates.length > 0 && (
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => setShowDuplicatesModal(true)}
                >
                  View All Names
                </Button>
              )}
            </Card.Body>
          </Card>

          <PossibleDuplicatesCard duplicates={getFilteredDuplicates()} />

          <DuplicateTable
            compareResult={unifiedCompareResult}
            searchTerm={searchTerm}
            onSearch={searchDuplicates}
            filteredDuplicates={filteredDuplicates.filter(dup => 
              selectedMatchType === 'ALL' || 
              selectedMatchType === 'REVIEW_ZONE' ? dup.in_review_zone : 
              dup.match_type === selectedMatchType
            )}
            onDownload={() => downloadDuplicatesAsExcel(unifiedCompareResult)}
          />

          <OriginalsTable compareResult={compareResult} />
        </>
      )}


      {/* Enhanced Duplicate Names Modal */}
      <Modal show={showDuplicatesModal} onHide={() => setShowDuplicatesModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>3-Tier Match Classification Results</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {duplicates?.map((dup, idx) => {
            const getBadgeVariant = (matchType) => {
              switch(matchType) {
                case 'DUPLICATE': return 'danger';
                case 'POSSIBLE_MISMATCH': return 'warning';
                default: return 'secondary';
              }
            };
            
            return (
              <div key={idx} className="mb-3 p-3 border rounded">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1">
                    <div className="fw-bold text-info">Database: {dup.db_name}</div>
                    <div className="fw-bold text-warning">Excel: {dup.excel_name}</div>
                  </div>
                  <div className="text-end">
                    <div className={`badge bg-${getBadgeVariant(dup.match_type)} mb-1`}>
                      {dup.match_type?.replace('_', ' ')}
                    </div>
                    <div className="fw-bold text-success d-block">{dup.similarity_score}%</div>
                    {dup.in_review_zone && (
                      <small className="text-muted d-block">⚠️ Requires Review</small>
                    )}
                  </div>
                </div>
                
                {dup.component_scores && (
                  <div className="small text-muted">
                    <span className="me-3">First: {dup.component_scores.first_name}%</span>
                    <span className="me-3">Middle: {dup.component_scores.middle_name}%</span>
                    <span>Last: {dup.component_scores.last_name}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <div className="me-auto small text-muted">
            Total: {duplicates.length} matches found
          </div>
          <Button variant="secondary" onClick={() => setShowDuplicatesModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
        
  );
}
