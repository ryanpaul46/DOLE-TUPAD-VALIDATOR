import { Card, Form, Button } from "react-bootstrap";
import LottieLoader from "./LottieLoader";
import { testSimilarity } from "../utils/testSimilarity";

export default function FileUploadForm({
  file,
  onFileChange,
  useSimpleAlgorithm,
  onAlgorithmChange,
  similarityThreshold,
  onThresholdChange,
  onCompare,
  onClear,
  loading,
  isProcessing
}) {
  return (
    <Card className="mb-4">
      <Card.Header>Upload Excel File for Duplicate Detection</Card.Header>
      <Card.Body>
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Select Excel File</Form.Label>
          <Form.Control type="file" accept=".xlsx, .xls" onChange={onFileChange} />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="algorithm-switch"
            label={useSimpleAlgorithm ? "Simple Algorithm (String Similarity)" : "Advanced Algorithm (Levenshtein + Fuse.js)"}
            checked={useSimpleAlgorithm}
            onChange={onAlgorithmChange}
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
            onChange={onThresholdChange}
          />
          <Form.Text className="text-muted">
            Duplicate: ≥80% | Review Zone: 60-79% | No Match: &lt;60%
          </Form.Text>
        </Form.Group>
        
        <div className="d-flex gap-2 flex-wrap">
          <Button 
            onClick={onCompare} 
            disabled={loading || isProcessing || !file}
            variant="primary"
          >
            {(loading || isProcessing) ? <LottieLoader size={20} /> : "Detect Duplicates"}
          </Button>
        
          <Button onClick={onClear} variant="outline-secondary">
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
  );
}