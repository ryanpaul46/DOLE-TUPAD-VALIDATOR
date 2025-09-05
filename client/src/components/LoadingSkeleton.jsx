import { Card, Placeholder, Spinner } from 'react-bootstrap';

export const StatCardSkeleton = ({ variant = 'primary' }) => (
  <Card className={`h-100 text-center border-${variant}`}>
    <Card.Body>
      <Placeholder as="div" animation="wave">
        <div className="mb-2">
          <Placeholder 
            xs={6} 
            className={`bg-${variant}`} 
            style={{ height: '40px', borderRadius: '50%', width: '40px', margin: '0 auto' }} 
          />
        </div>
        <Placeholder xs={8} className={`mb-2 bg-${variant}`} style={{ height: '32px' }} />
        <Placeholder xs={10} className="bg-secondary" style={{ height: '16px' }} />
      </Placeholder>
    </Card.Body>
  </Card>
);

export const ChartSkeleton = ({ title = 'Loading Chart...' }) => (
  <Card>
    <Card.Header>
      <Placeholder as="div" animation="wave">
        <Placeholder xs={6} className="bg-dark" />
      </Placeholder>
    </Card.Header>
    <Card.Body>
      <Placeholder as="div" animation="wave">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <Placeholder xs={4} className="bg-secondary" />
              <Placeholder xs={2} className="bg-primary" style={{ borderRadius: '12px' }} />
            </div>
            <Placeholder 
              xs={12} 
              className="bg-light" 
              style={{ height: '6px', borderRadius: '3px' }} 
            />
          </div>
        ))}
      </Placeholder>
    </Card.Body>
  </Card>
);

export const RefreshIndicator = ({ isRefreshing }) => (
  isRefreshing && (
    <div className="d-flex align-items-center text-muted small">
      <Spinner size="sm" className="me-2" />
      Updating...
    </div>
  )
);

export const LastUpdated = ({ timestamp }) => (
  timestamp && (
    <small className="text-muted">
      Last updated: {timestamp.toLocaleTimeString()}
    </small>
  )
);