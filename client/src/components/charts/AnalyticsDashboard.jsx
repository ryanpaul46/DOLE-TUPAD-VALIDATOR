import { useState, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { GraphUp, BarChart, PieChart, Activity, Download } from 'react-bootstrap-icons';
import InteractiveBarChart from './InteractiveBarChart';
import InteractivePieChart from './InteractivePieChart';
import TrendLineChart from './TrendLineChart';
import DrillDownModal from './DrillDownModal';
import { useTrendAnalysis } from '../../hooks/useTrendAnalysis';

const AnalyticsDashboard = ({ statistics, onExportData }) => {
  const [drillDownData, setDrillDownData] = useState(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  const { 
    trendData, 
    historicalData, 
    loading: trendLoading, 
    insights,
    growthRate 
  } = useTrendAnalysis('beneficiaries', timeRange);

  const handleDrillDown = useCallback(async (item, chartType) => {
    try {
      // Mock drill-down data - in real implementation, fetch from API
      const mockDrillDownData = generateDrillDownData(item, chartType);
      
      setDrillDownData({
        title: `${chartType} - ${item.label || item.name || item.project_series || item.province}`,
        data: mockDrillDownData,
        selectedItem: item
      });
      setSelectedChart(chartType);
      setShowDrillDown(true);
    } catch (error) {
      console.error('Drill-down error:', error);
    }
  }, []);

  const generateDrillDownData = (item, chartType) => {
    // Generate mock detailed data based on the selected item
    const baseData = [];
    const itemName = item.label || item.name || item.project_series || item.province;
    
    for (let i = 0; i < 20; i++) {
      baseData.push({
        id: i + 1,
        name: `${itemName} - Record ${i + 1}`,
        value: Math.floor(Math.random() * 1000) + 100,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: ['Category A', 'Category B', 'Category C'][Math.floor(Math.random() * 3)],
        status: ['Active', 'Pending', 'Completed'][Math.floor(Math.random() * 3)],
        region: ['Region 1', 'Region 2', 'Region 3'][Math.floor(Math.random() * 3)]
      });
    }
    
    return baseData;
  };

  const handleExportDrillDown = () => {
    if (drillDownData && onExportData) {
      onExportData(drillDownData.data, `${drillDownData.title}_detailed_data`);
    }
  };

  const handleFilterDrillDown = () => {
    // Implement filter functionality
    console.log('Filter drill-down data');
  };

  if (!statistics) {
    return (
      <Container fluid className="p-4">
        <Alert variant="info">Loading analytics dashboard...</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Insights Banner */}
      {insights && insights.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 bg-light">
              <Card.Body className="py-3">
                <div className="d-flex align-items-center mb-2">
                  <Activity className="me-2 text-primary" size={20} />
                  <strong>Key Insights</strong>
                  {growthRate !== null && (
                    <Badge 
                      bg={growthRate > 0 ? 'success' : 'danger'} 
                      className="ms-2"
                    >
                      {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="d-flex align-items-center">
                      <div 
                        className={`me-2 rounded-circle d-flex align-items-center justify-content-center`}
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: insight.type === 'positive' ? '#198754' : 
                                         insight.type === 'negative' ? '#dc3545' : '#0dcaf0'
                        }}
                      />
                      <div>
                        <strong className="small">{insight.title}</strong>
                        <div className="text-muted small">{insight.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Trend Analysis */}
      <Row className="mb-4">
        <Col>
          <TrendLineChart
            title="Beneficiaries Trend"
            data={trendData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onDrillDown={(item, index) => handleDrillDown(item, 'Trend Analysis')}
            colorScheme="primary"
          />
        </Col>
      </Row>

      {/* Interactive Charts */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <InteractiveBarChart
            title="Top Project Series"
            data={statistics?.projectSeries?.slice(0, 10).map(item => ({
              ...item,
              label: item.project_series
            })) || []}
            onDrillDown={(item, index) => handleDrillDown(item, 'Project Series')}
            showTrend={true}
            trendData={historicalData?.slice(0, 10)}
            colorScheme="primary"
          />
        </Col>
        <Col lg={6} className="mb-4">
          <InteractiveBarChart
            title="Top Provinces"
            data={statistics?.provinces?.slice(0, 10).map(item => ({
              ...item,
              label: item.province
            })) || []}
            onDrillDown={(item, index) => handleDrillDown(item, 'Provinces')}
            showTrend={true}
            trendData={historicalData?.slice(0, 10)}
            colorScheme="info"
          />
        </Col>
      </Row>

      {/* Pie Charts */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <InteractivePieChart
            title="Gender Distribution"
            data={statistics?.genderDistribution?.map(item => ({
              ...item,
              label: item.sex
            })) || []}
            onDrillDown={(item, index) => handleDrillDown(item, 'Gender Distribution')}
            colorScheme="success"
            showLegend={false}
            centerText={{
              value: statistics?.totalBeneficiaries?.toLocaleString() || '0',
              label: 'Total Beneficiaries'
            }}
          />
        </Col>
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <strong>Age Statistics Overview</strong>
            </Card.Header>
            <Card.Body>
              {statistics?.ageStats ? (
                <Row className="text-center">
                  <Col md={4} className="mb-3">
                    <div className="h2 text-primary mb-1">
                      {Math.round(statistics.ageStats.avg_age || 0)}
                    </div>
                    <small className="text-muted">Average Age</small>
                  </Col>
                  <Col md={4} className="mb-3">
                    <div className="h2 text-success mb-1">
                      {statistics.ageStats.min_age || 0}
                    </div>
                    <small className="text-muted">Minimum Age</small>
                  </Col>
                  <Col md={4} className="mb-3">
                    <div className="h2 text-warning mb-1">
                      {statistics.ageStats.max_age || 0}
                    </div>
                    <small className="text-muted">Maximum Age</small>
                  </Col>
                </Row>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No age data available</p>
                </div>
              )}
              <div className="text-center mt-3">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => handleDrillDown({ label: 'Age Statistics' }, 'Age Analysis')}
                >
                  <BarChart className="me-1" size={16} />
                  View Detailed Age Analysis
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Export Actions */}
      <Row>
        <Col className="text-center">
          <Button 
            variant="outline-success" 
            onClick={() => onExportData && onExportData(statistics, 'analytics_dashboard')}
          >
            <Download className="me-2" size={16} />
            Export Dashboard Data
          </Button>
        </Col>
      </Row>

      {/* Drill Down Modal */}
      <DrillDownModal
        show={showDrillDown}
        onHide={() => setShowDrillDown(false)}
        title={drillDownData?.title || ''}
        data={drillDownData?.data || []}
        selectedItem={drillDownData?.selectedItem}
        onExport={handleExportDrillDown}
        onFilter={handleFilterDrillDown}
      />
    </Container>
  );
};

export default AnalyticsDashboard;