import React from 'react';
import { ProgressBar, Card } from 'react-bootstrap';

const ProgressTracker = ({ 
  progress = 0, 
  total = 0, 
  processed = 0,
  duplicatesFound = 0,
  status = 'idle',
  message = '',
  showDetails = true,
  variant = 'primary'
}) => {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
  
  const getStatusVariant = () => {
    switch (status) {
      case 'processing': return 'primary';
      case 'completed': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      default: return variant;
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'processing': return `Processing... ${processed}/${total} rows`;
      case 'completed': return `Completed! ${processed} rows processed`;
      case 'error': return 'Processing failed';
      case 'idle': return 'Ready to process';
      default: return '';
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  if (status === 'idle' || (!showDetails && percentage === 0)) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Processing Progress</h6>
          <span className={`badge bg-${getStatusVariant()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        
        <ProgressBar 
          now={percentage} 
          variant={getStatusVariant()}
          className="mb-2"
          style={{ height: '8px' }}
        />
        
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            {getStatusMessage()}
          </small>
          <small className="fw-bold">
            {percentage}%
          </small>
        </div>
        
        {showDetails && (processed > 0 || duplicatesFound > 0) && (
          <div className="row mt-3">
            <div className="col-md-4">
              <div className="text-center">
                <div className="fw-bold text-primary">{formatNumber(processed)}</div>
                <small className="text-muted">Rows Processed</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="fw-bold text-warning">{formatNumber(duplicatesFound)}</div>
                <small className="text-muted">Duplicates Found</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="fw-bold text-success">{formatNumber(processed - duplicatesFound)}</div>
                <small className="text-muted">Unique Records</small>
              </div>
            </div>
          </div>
        )}
        
        {status === 'processing' && (
          <div className="mt-2">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <small className="text-muted">
                {total > 0 ? `${formatNumber(total - processed)} rows remaining` : 'Processing...'}
              </small>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProgressTracker;