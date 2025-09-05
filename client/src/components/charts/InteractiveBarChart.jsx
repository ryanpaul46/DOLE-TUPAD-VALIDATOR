import { Bar } from 'react-chartjs-2';
import { Card, Button, ButtonGroup } from 'react-bootstrap';
import { useState } from 'react';
import './ChartRegistry';

const InteractiveBarChart = ({ 
  title, 
  data, 
  onDrillDown, 
  showTrend = false,
  trendData = null,
  colorScheme = 'primary' 
}) => {
  const [viewMode, setViewMode] = useState('current');
  const [selectedIndex, setSelectedIndex] = useState(null);

  const colors = {
    primary: ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545'],
    success: ['#198754', '#20c997', '#0dcaf0', '#fd7e14', '#ffc107'],
    info: ['#0dcaf0', '#20c997', '#198754', '#fd7e14', '#ffc107'],
    warning: ['#ffc107', '#fd7e14', '#dc3545', '#d63384', '#6f42c1']
  };

  const chartData = {
    labels: data?.map(item => item.label || item.name || item.project_series || item.province) || [],
    datasets: [
      {
        label: viewMode === 'trend' ? 'Current Period' : title,
        data: data?.map(item => item.count || item.value) || [],
        backgroundColor: colors[colorScheme],
        borderColor: colors[colorScheme].map(color => color + '80'),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
      ...(showTrend && viewMode === 'trend' && trendData ? [{
        label: 'Previous Period',
        data: trendData?.map(item => item.count || item.value) || [],
        backgroundColor: colors[colorScheme].map(color => color + '40'),
        borderColor: colors[colorScheme].map(color => color + '60'),
        borderWidth: 1,
        borderRadius: 4,
      }] : [])
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
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
            const label = context.dataset.label || '';
            const value = context.parsed.y.toLocaleString();
            const percentage = data?.length > 0 
              ? ((context.parsed.y / data.reduce((sum, item) => sum + (item.count || item.value), 0)) * 100).toFixed(1)
              : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => value.toLocaleString()
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onDrillDown) {
        const index = elements[0].index;
        setSelectedIndex(index);
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
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>{title}</strong>
        {showTrend && trendData && (
          <ButtonGroup size="sm">
            <Button 
              variant={viewMode === 'current' ? 'primary' : 'outline-primary'}
              onClick={() => setViewMode('current')}
            >
              Current
            </Button>
            <Button 
              variant={viewMode === 'trend' ? 'primary' : 'outline-primary'}
              onClick={() => setViewMode('trend')}
            >
              Trend
            </Button>
          </ButtonGroup>
        )}
      </Card.Header>
      <Card.Body>
        <div style={{ height: '300px', position: 'relative' }}>
          <Bar data={chartData} options={options} />
        </div>
        {selectedIndex !== null && onDrillDown && (
          <div className="mt-2 text-center">
            <small className="text-muted">
              Click on bars to drill down for detailed insights
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default InteractiveBarChart;