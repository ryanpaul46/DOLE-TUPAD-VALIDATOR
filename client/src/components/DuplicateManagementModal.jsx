import { useState } from 'react';
import { Modal, Button, Form, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { DuplicateDetectionService } from '../services/duplicateDetectionService';

export default function DuplicateManagementModal({ 
  show, 
  onHide, 
  scanResults, 
  onDataRefresh 
}) {
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [uploading, setUploading] = useState(false);

  const toggleSelection = (index) => {
    setSelectedDuplicates(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleUpload = async () => {
    if (selectedDuplicates.length === 0) return;

    try {
      setUploading(true);
      const duplicatesToUpload = selectedDuplicates.map(idx => scanResults.duplicates[idx]);
      await DuplicateDetectionService.uploadSelectedDuplicates(duplicatesToUpload, remarks);
      
      onDataRefresh();
      onHide();
      setSelectedDuplicates([]);
      setRemarks('');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
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
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
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
                onChange={() => toggleSelection(idx)}
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
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        {selectedDuplicates.length > 0 && (
          <Button 
            variant="warning" 
            onClick={handleUpload}
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
  );
}