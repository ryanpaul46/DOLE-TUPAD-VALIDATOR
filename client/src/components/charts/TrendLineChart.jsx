import { Line } from 'react-chartjs-2';
import { Card, Button, ButtonGroup, Badge } from 'react-bootstrap';
import { useState } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import './ChartRegistry';

const TrendLineChart = ({ 
  title, 
  data, 
  timeRange = '30d',
  onTimeRangeChange,
  onDrillDown,
  colorScheme = 'primary'
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const colors = {
    primary: '#0d6efd',
    success: '#198754',
    info: '#0dcaf0',
    warning: '#ffc107',
    danger: '#dc3545'
  };

  const timeRanges = [
    { key: '7d', label: '7 Days', days: 7 },
    { key: '30d', label: '30 Days', days: 30 },
    { key: '90d', label: '90 Days', days: 90 },
    { key: '1y', label: '1 Year', days: 365 }
  ];

  const handleTimeRangeChange = (range) => {
    setSelectedTimeRange(range);
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
  };

  const chartData = {
    labels: data?.map(item => {
      const date = new Date(item.date || item.timestamp);
      return selectedTimeRange === '1y' 
        ? format(date, 'MMM yyyy')
        : format(date, 'MMM dd');
    }) || [],
    datasets: [
      {
        label: title,
        data: data?.map(item => item.count || item.value) || [],
        borderColor: colors[colorScheme],
        backgroundColor: colors[colorScheme] + '20',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors[colorScheme],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: colors[colorScheme],
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const date = new Date(data[context[0].dataIndex]?.date || data[context[0].dataIndex]?.timestamp);
            return format(date, 'PPP');
          },
          label: (context) => {
            const value = context.parsed.y.toLocaleString();
            const prevValue = context.dataIndex > 0 ? data[context.dataIndex - 1]?.count || data[context.dataIndex - 1]?.value : 0;
            const change = prevValue > 0 ? (((context.parsed.y - prevValue) / prevValue) * 100).toFixed(1) : 0;
            const changeText = change > 0 ? `+${change}%` : `${change}%`;
            return [
              `${title}: ${value}`,
              context.dataIndex > 0 ? `Change: ${changeText}` : ''
            ].filter(Boolean);
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
        setSelectedPoint(index);
        const item = data[index];
        onDrillDown(item, index);
      }
    },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 && onDrillDown ? 'pointer' : 'default';
    }
  };

  const calculateTrend = () => {
    if (!data || data.length < 2) return null;
    
    const recent = data.slice(-7).reduce((sum, item) => sum + (item.count || item.value), 0) / 7;
    const previous = data.slice(-14, -7).reduce((sum, item) => sum + (item.count || item.value), 0) / 7;
    
    if (previous === 0) return null;
    
    const change = ((recent - previous) / previous) * 100;
    return {
      value: change.toFixed(1),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 1
    };
  };

  const trend = calculateTrend();

  return (
    <Card className="h-100">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <strong>{title}</strong>
          {trend && (
            <Badge 
              bg={trend.isNeutral ? 'secondary' : trend.isPositive ? 'success' : 'danger'}
              className="ms-2"
            >
              {trend.isPositive ? '↗' : trend.isNeutral ? '→' : '↘'} {Math.abs(trend.value)}%
            </Badge>
          )}
        </div>
        <ButtonGroup size="sm">
          {timeRanges.map(range => (
            <Button
              key={range.key}
              variant={selectedTimeRange === range.key ? 'primary' : 'outline-primary'}
              onClick={() => handleTimeRangeChange(range.key)}
            >
              {range.label}
            </Button>
          ))}
        </ButtonGroup>
      </Card.Header>
      <Card.Body>
        <div style={{ height: '300px', position: 'relative' }}>
          <Line data={chartData} options={options} />
        </div>
        {data && data.length > 0 && (
          <div className="mt-3 d-flex justify-content-between text-muted small">
            <span>
              Total: {data.reduce((sum, item) => sum + (item.count || item.value), 0).toLocaleString()}
            </span>
            <span>
              Average: {Math.round(data.reduce((sum, item) => sum + (item.count || item.value), 0) / data.length).toLocaleString()}
            </span>
            <span>
              Peak: {Math.max(...data.map(item => item.count || item.value)).toLocaleString()}
            </span>
          </div>
        )}
        {onDrillDown && (
          <div className="mt-2 text-center">
            <small className="text-muted">
              Click on data points to drill down for detailed insights
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default TrendLineChart;