import { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Alert, Card, Badge, Tabs, Tab } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { People, FileEarmark, GeoAlt, Calendar, PieChart, BarChart, ArrowClockwise, Activity, GraphUp, Search } from "react-bootstrap-icons";
import api from "../api/axios";
import { StatCardSkeleton, ChartSkeleton, RefreshIndicator, LastUpdated } from "../components/LoadingSkeleton";
import { useToast } from "../hooks/useToast";
import { useRealTimeStats } from "../hooks/useRealTimeStats";
import AnalyticsDashboard from "../components/charts/AnalyticsDashboard";
import ToastContainer from "../components/ToastContainer";

export default function Admin() {
  const [admin, setAdmin] = useState({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const { statistics, loading: statsLoading, error: statsError, lastUpdated, refreshStats } = useRealTimeStats(30000);

  const calculatePercentage = (count, total) => {
    return total > 0 ? (count / total * 100) : 0;
  };

  const fetchAdminInfo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/users/me");
      const data = res.data;
      
      const firstName = data.first_name || 'User';
      const lastName = data.last_name || '';
      
      setAdmin({ firstName, lastName });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch admin info.");
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshStats();
      showToast("Statistics refreshed", "success");
    } catch (err) {
      showToast("Failed to refresh statistics", "danger");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshStats, showToast]);

  useEffect(() => {
    fetchAdminInfo();
  }, [fetchAdminInfo]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleManualRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleManualRefresh]);

  const handleExportData = useCallback((data, filename) => {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export data', 'danger');
    }
  }, [showToast]);

  if (loading) {
    return (
      <Container fluid className="p-4">
        <Row className="mb-4">
          {[...Array(4)].map((_, i) => (
            <Col md={3} key={i} className="mb-3">
              <StatCardSkeleton />
            </Col>
          ))}
        </Row>
        <Row>
          <Col lg={6}><ChartSkeleton /></Col>
          <Col lg={6}><ChartSkeleton /></Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {error && <Alert variant="danger">{error}</Alert>}
      {statsError && <Alert variant="warning">{statsError}</Alert>}
      
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Welcome, {admin.firstName} </h2>
              <p className="text-muted mb-1">Administrative dashboard with system statistics and management tools</p>
              <LastUpdated timestamp={lastUpdated} />
            </div>
            <div className="d-flex align-items-center gap-2">
              <RefreshIndicator isRefreshing={isRefreshing || statsLoading} />
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={handleManualRefresh}
                disabled={isRefreshing || statsLoading}
              >
                <ArrowClockwise className={isRefreshing ? "spin" : ""} />
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          {statsLoading ? (
            <StatCardSkeleton variant="primary" />
          ) : (
            <Card className="h-100 text-center border-primary">
              <Card.Body>
                <People size={40} className="text-primary mb-2" />
                <h4 className="text-primary">
                  {statistics?.totalBeneficiaries?.toLocaleString() || 0}
                </h4>
                <small className="text-muted">Total Beneficiaries</small>
              </Card.Body>
            </Card>
          )}
        </Col>
        <Col md={3} className="mb-3">
          {statsLoading ? (
            <StatCardSkeleton variant="success" />
          ) : (
            <Card className="h-100 text-center border-success">
              <Card.Body>
                <FileEarmark size={40} className="text-success mb-2" />
                <h4 className="text-success">
                  {statistics?.totalUsers || 0}
                </h4>
                <small className="text-muted">System Users</small>
              </Card.Body>
            </Card>
          )}
        </Col>
        <Col md={3} className="mb-3">
          {statsLoading ? (
            <StatCardSkeleton variant="info" />
          ) : (
            <Card className="h-100 text-center border-info">
              <Card.Body>
                <GeoAlt size={40} className="text-info mb-2" />
                <h4 className="text-info">
                  {statistics?.provinces?.length || 0}
                </h4>
                <small className="text-muted">Provinces Covered</small>
              </Card.Body>
            </Card>
          )}
        </Col>
        <Col md={3} className="mb-3">
          {statsLoading ? (
            <StatCardSkeleton variant="warning" />
          ) : (
            <Card className="h-100 text-center border-warning">
              <Card.Body>
                <BarChart size={40} className="text-warning mb-2" />
                <h4 className="text-warning">
                  {statistics?.totalProjectSeries || 0}
                </h4>
                <small className="text-muted">Project Series</small>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Analytics Tabs */}
      <Tabs 
        activeKey={activeTab} 
        onSelect={setActiveTab} 
        className="mb-4"
        fill
      >
        <Tab 
          eventKey="overview" 
          title={
            <span>
              <Activity className="me-2" size={16} />
              Overview
            </span>
          }
        >
          {/* Quick Stats Cards */}
          <Row className="mb-4">
            <Col lg={3} className="mb-3">
              <Card className="text-center border-primary h-100">
                <Card.Body>
                  <div className="h3 text-primary mb-2">
                    {statistics?.projectSeries?.length || 0}
                  </div>
                  <small className="text-muted">Active Project Series</small>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} className="mb-3">
              <Card className="text-center border-success h-100">
                <Card.Body>
                  <div className="h3 text-success mb-2">
                    {statistics?.provinces?.length || 0}
                  </div>
                  <small className="text-muted">Covered Provinces</small>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} className="mb-3">
              <Card className="text-center border-info h-100">
                <Card.Body>
                  <div className="h3 text-info mb-2">
                    {statistics?.genderDistribution?.length || 0}
                  </div>
                  <small className="text-muted">Gender Categories</small>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} className="mb-3">
              <Card className="text-center border-warning h-100">
                <Card.Body>
                  <div className="h3 text-warning mb-2">
                    {Math.round(statistics?.ageStats?.avg_age || 0)}
                  </div>
                  <small className="text-muted">Average Age</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab 
          eventKey="analytics" 
          title={
            <span>
              <GraphUp className="me-2" size={16} />
              Interactive Analytics
            </span>
          }
        >
          {!statsLoading && statistics ? (
            <AnalyticsDashboard 
              statistics={statistics} 
              onExportData={handleExportData}
            />
          ) : (
            <Row>
              <Col lg={6}><ChartSkeleton /></Col>
              <Col lg={6}><ChartSkeleton /></Col>
            </Row>
          )}
        </Tab>
      </Tabs>

      {/* Action Buttons */}
      {activeTab === 'overview' && (
        <Row>
          <Col md={3} className="mb-3">
            <Button
              variant="primary"
              size="lg"
              className="w-100"
              onClick={() => {
                navigate("/admin/users");
                showToast("Navigating to user management", "info");
              }}
            >
              <People className="me-2" />
              Manage Users
            </Button>
          </Col>
          <Col md={3} className="mb-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-100"
              onClick={() => {
                navigate("/admin/database");
                showToast("Navigating to database view", "info");
              }}
            >
              <FileEarmark className="me-2" />
              View Database
            </Button>
          </Col>
          <Col md={3} className="mb-3">
            <Button
              variant="info"
              size="lg"
              className="w-100"
              onClick={() => {
                navigate("/admin/search");
                showToast("Navigating to search", "info");
              }}
            >
              <Search className="me-2" />
              Search Data
            </Button>
          </Col>
          <Col md={3} className="mb-3">
            <Button
              variant="success"
              size="lg"
              className="w-100"
              onClick={() => setActiveTab('analytics')}
            >
              <GraphUp className="me-2" />
              View Analytics
            </Button>
          </Col>
        </Row>
      )}
    </Container>
  );
}
