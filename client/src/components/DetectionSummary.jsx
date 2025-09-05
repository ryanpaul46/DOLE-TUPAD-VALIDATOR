import { Card, Form, Button } from "react-bootstrap";

export default function DetectionSummary({
  compareResult,
  matchStats,
  duplicates,
  selectedMatchType,
  onMatchTypeChange,
  onViewAllNames
}) {
  return (
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
          <Form.Select value={selectedMatchType} onChange={onMatchTypeChange}>
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
          <Button variant="outline-primary" size="sm" onClick={onViewAllNames}>
            View All Names
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}