import { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { People, FileEarmark, GeoAlt, BarChart } from "react-bootstrap-icons";
import api from "../api/axios";
import { StatCardSkeleton, ChartSkeleton } from "../components/LoadingSkeleton";
import { useToast } from "../hooks/useToast";
import ToastContainer from "../components/ToastContainer";
import { ModernStatCard, ModernChartCard } from "../components/ModernCard";
import ModernProgressBar from "../components/ModernProgressBar";
import '../styles/theme.css';

export default function Admin() {
  const [admin, setAdmin] = useState({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const calculatePercentage = (count, total) => {
    return total > 0 ? (count / total * 100) : 0;
  };

  const fetchAdminInfo = async () => {
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
  };

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      setStatsError("");
      const res = await api.get("/api/admin-statistics");
      setStatistics(res.data);
    } catch (err) {
      setStatsError("Failed to load statistics. Please refresh to try again.");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminInfo();
    fetchStatistics();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        fetchStatistics();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);



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
      
      <div className="mb-5 text-center">
        <h1 className="display-4 fw-bold mb-3" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome, {admin.firstName}
        </h1>
        <p className="lead text-muted">Administrative dashboard with system statistics and management tools</p>
      </div>

      {/* Main Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-4">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <ModernStatCard
              icon={<People size={48} />}
              value={statistics?.totalBeneficiaries?.toLocaleString() || 0}
              label="Total Beneficiaries"
              variant="primary"
            />
          )}
        </Col>
        <Col md={3} className="mb-4">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <ModernStatCard
              icon={<FileEarmark size={48} />}
              value={statistics?.totalUsers || 0}
              label="System Users"
              variant="success"
            />
          )}
        </Col>
        <Col md={3} className="mb-4">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <ModernStatCard
              icon={<GeoAlt size={48} />}
              value={statistics?.provinces?.length || 0}
              label="Provinces Covered"
              variant="info"
            />
          )}
        </Col>
        <Col md={3} className="mb-4">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <ModernStatCard
              icon={<BarChart size={48} />}
              value={statistics?.totalProjectSeries || 0}
              label="Project Series"
              variant="warning"
            />
          )}
        </Col>
      </Row>

      {/* Detailed Statistics */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <ModernChartCard
            title="Top Project Series"
            icon={<FileEarmark />}
            loading={statsLoading}
          >
            {statistics?.projectSeries?.slice(0, 5).map((item, idx) => {
              const percentage = calculatePercentage(item.count, statistics.totalBeneficiaries);
              return (
                <ModernProgressBar
                  key={idx}
                  label={item.project_series || 'Unknown'}
                  value={item.count}
                  percentage={percentage}
                  variant="primary"
                />
              );
            })}
          </ModernChartCard>
        </Col>
        <Col lg={6} className="mb-4">
          <ModernChartCard
            title="Top Provinces"
            icon={<GeoAlt />}
            loading={statsLoading}
          >
            {statistics?.provinces?.slice(0, 5).map((item, idx) => {
              const percentage = calculatePercentage(item.count, statistics.totalBeneficiaries);
              return (
                <ModernProgressBar
                  key={idx}
                  label={item.province || 'Unknown'}
                  value={item.count}
                  percentage={percentage}
                  variant="info"
                />
              );
            })}
          </ModernChartCard>
        </Col>
      </Row>

      {/* Action Buttons */}
      <Row>
        <Col md={6} className="mb-3">
          <Button
            variant="primary"
            size="lg"
            className="w-100 btn-modern"
            onClick={() => {
              navigate("/admin/users");
              showToast("Navigating to user management", "info");
            }}
            onKeyDown={(e) => e.key === 'Enter' && navigate("/admin/users")}
          >
            <People className="me-2" />
            Manage Users
          </Button>
        </Col>
        <Col md={6} className="mb-3">
          <Button
            variant="outline-primary"
            size="lg"
            className="w-100 btn-modern"
            onClick={() => {
              navigate("/admin/database");
              showToast("Navigating to database view", "info");
            }}
            onKeyDown={(e) => e.key === 'Enter' && navigate("/admin/database")}
          >
            <FileEarmark className="me-2" />
            View Database
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
