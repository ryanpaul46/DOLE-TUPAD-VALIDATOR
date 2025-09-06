import { Badge } from 'react-bootstrap';
import '../styles/theme.css';

export default function ModernProgressBar({ label, value, percentage, variant = 'primary' }) {
  const gradients = {
    primary: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    info: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
    warning: 'linear-gradient(90deg, #fa709a 0%, #fee140 100%)'
  };

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-medium text-dark">{label}</span>
        <Badge 
          style={{ 
            background: gradients[variant],
            border: 'none'
          }}
          className="px-3 py-2"
        >
          {value?.toLocaleString()}
        </Badge>
      </div>
      <div className="progress-modern">
        <div
          className="progress-bar"
          style={{
            width: `${percentage}%`,
            background: gradients[variant],
            transition: 'width 0.8s ease-out'
          }}
        />
      </div>
    </div>
  );
}