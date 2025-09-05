import { Doughnut } from 'react-chartjs-2';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { useState } from 'react';
import './ChartRegistry';

const InteractivePieChart = ({ 
  title, 
  data, 
  onDrillDown,
  colorScheme = 'primary',
  showLegend = true,
  centerText = null
}) => {
  const [selectedSegment, setSelectedSegment] = useState(null);

  const colors = {
    primary: ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'],
    success: ['#198754', '#20c997', '#0dcaf0', '#fd7e14', '#ffc107', '#dc3545', '#d63384', '#6f42c1', '#6610f2', '#0d6efd'],
    info: ['#0dcaf0', '#20c997', '#198754', '#fd7e14', '#ffc107', '#dc3545', '#d63384', '#6f42c1', '#6610f2', '#0d6efd'],
    warning: ['#ffc107', '#fd7e14', '#dc3545', '#d63384', '#6f42c1', '#6610f2', '#0d6efd', '#198754', '#20c997', '#0dcaf0']
  };

  const total = data?.reduce((sum, item) => sum + (item.count || item.value), 0) || 0;

  const chartData = {
    labels: data?.map(item => item.label || item.name || item.sex || item.status) || [],
    datasets: [
      {
        data: data?.map(item => item.count || item.value) || [],
        backgroundColor: colors[colorScheme],
        borderColor: '#fff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 10
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${value.toLocaleString()} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onDrillDown) {
        const index = elements[0].index;
        setSelectedSegment(index);
        const item = data[index];
        onDrillDown(item, index);
      }
    },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 && onDrillDown ? 'pointer' : 'default';
    }
  };

  return (
    <Card className="h-100">
      <Card.Header>
        <strong>{title}</strong>
        {total > 0 && (
          <Badge bg="secondary" className="ms-2">
            Total: {total.toLocaleString()}
          </Badge>
        )}
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={showLegend ? 8 : 12}>
            <div style={{ height: '300px', position: 'relative' }}>
              <Doughnut data={chartData} options={options} />
              {centerText && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <div className="h4 mb-0">{centerText.value}</div>
                  <small className="text-muted">{centerText.label}</small>
                </div>
              )}
            </div>
          </Col>
          {!showLegend && (
            <Col md={4}>
              <div className="mt-3">
                {data?.map((item, index) => {
                  const percentage = ((item.count || item.value) / total * 100).toFixed(1);
                  return (
                    <div 
                      key={index} 
                      className={`d-flex justify-content-between align-items-center mb-2 p-2 rounded ${
                        selectedSegment === index ? 'bg-light' : ''
                      }`}
                      style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                      onClick={() => onDrillDown && onDrillDown(item, index)}
                    >
                      <div className="d-flex align-items-center">
                        <div 
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: colors[colorScheme][index],
                            borderRadius: '50%',
                            marginRight: '8px'
                          }}
                        />
                        <small>{item.label || item.name || item.sex || item.status}</small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">{(item.count || item.value).toLocaleString()}</div>
                        <small className="text-muted">{percentage}%</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Col>
          )}
        </Row>
        {onDrillDown && (
          <div className="mt-2 text-center">
            <small className="text-muted">
              Click on segments to drill down for detailed insights
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default InteractivePieChart;