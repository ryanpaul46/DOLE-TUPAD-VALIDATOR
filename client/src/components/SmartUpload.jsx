import { useState } from 'react';
import { Button, Form, Spinner, Badge, Modal, Row, Col } from 'react-bootstrap';
import { Upload } from 'react-bootstrap-icons';
import { DuplicateDetectionService } from '../services/duplicateDetectionService';
import DuplicateManagementModal from './DuplicateManagementModal';

export default function SmartUpload({ data, onDataRefresh }) {
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  const handleScan = async () => {
    if (!file) return;

    try {
      setScanning(true);
      const results = await DuplicateDetectionService.scanFile(file, data, 60);
      setScanResults(results);
      setShowScanModal(true);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleUploadNew = async () => {
    try {
      setUploading(true);
      await DuplicateDetectionService.uploadNewRecords(scanResults.newRecords);
      onDataRefresh();
      setShowScanModal(false);
      setScanResults(null);
      setFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
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
          onChange={(e) => setFile(e.target.files[0])}
          style={{ maxWidth: "300px" }}
        />
        <Button
          variant="success"
          onClick={handleScan}
          disabled={scanning || !file}
          size="sm"
        >
          {scanning ? (
            <>
              <Spinner size="sm" animation="border" className="me-1" />
              Scanning...
            </>
          ) : (
            <>
              <Upload size={16} className="me-1" />
              Scan & Upload
            </>
          )}
        </Button>
      </div>

      {/* Scan Results Modal */}
      <Modal show={showScanModal} onHide={() => setShowScanModal(false)} size="lg">
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
          <Button variant="secondary" onClick={() => setShowScanModal(false)}>
            Cancel
          </Button>
          {scanResults?.totalNewRecords > 0 && (
            <Button 
              variant="success" 
              onClick={handleUploadNew}
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

      <DuplicateManagementModal
        show={showDuplicatesModal}
        onHide={() => setShowDuplicatesModal(false)}
        scanResults={scanResults}
        onDataRefresh={onDataRefresh}
      />
    </div>
  );
}