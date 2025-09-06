import { Card } from 'react-bootstrap';
import '../styles/theme.css';

export const ModernStatCard = ({ icon, value, label, variant = 'primary', loading = false }) => {
  const gradients = {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    info: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  };

  return (
    <Card className="modern-card stat-card h-100 text-center">
      <div 
        style={{ 
          background: gradients[variant],
          height: '4px',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }}
      />
      <Card.Body className="p-4">
        <div className="mb-3" style={{ color: gradients[variant].split(' ')[1] }}>
          {icon}
        </div>
        <h3 className={`animate-number text-${variant} mb-2`}>
          {loading ? '...' : value}
        </h3>
        <small className="text-muted fw-medium">{label}</small>
      </Card.Body>
    </Card>
  );
};

export const ModernChartCard = ({ title, icon, children, loading = false }) => (
  <Card className="modern-card h-100">
    <Card.Header className="gradient-bg border-0 py-3">
      <h6 className="mb-0 fw-bold">
        {icon && <span className="me-2">{icon}</span>}
        {title}
      </h6>
    </Card.Header>
    <Card.Body className="p-4">
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : children}
    </Card.Body>
  </Card>
);