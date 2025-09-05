import { Modal, Button } from "react-bootstrap";

export default function DuplicatesModal({ show, onHide, duplicates }) {
  const getBadgeVariant = (matchType) => {
    switch(matchType) {
      case 'DUPLICATE': return 'danger';
      case 'POSSIBLE_MISMATCH': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>3-Tier Match Classification Results</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {duplicates?.map((dup, idx) => (
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
        ))}
      </Modal.Body>
      <Modal.Footer>
        <div className="me-auto small text-muted">
          Total: {duplicates.length} matches found
        </div>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}