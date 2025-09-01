import { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert, Card, Badge, ProgressBar } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { People, FileEarmark, GeoAlt, Calendar, PieChart, BarChart } from "react-bootstrap-icons";
import api from "../api/axios";

export default function Admin() {
  const [admin, setAdmin] = useState({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAdminInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/users/me");
      const data = res.data;
      
      // Extract name fields from API response
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
      const res = await api.get("/api/admin-statistics");
      setStatistics(res.data);
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminInfo();
    fetchStatistics();
  }, []);

  if (loading) return <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}><Spinner animation="border" /></Container>;

  return (
    <Container fluid className="p-4">
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <h2>Welcome, {admin.firstName} </h2>
          <p className="text-muted">Administrative dashboard with system statistics and management tools</p>
        </Col>
      </Row>

      {/* Main Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 text-center border-primary">
            <Card.Body>
              <People size={40} className="text-primary mb-2" />
              <h4 className="text-primary">
                {statsLoading ? <Spinner size="sm" /> : statistics?.totalBeneficiaries?.toLocaleString() || 0}
              </h4>
              <small className="text-muted">Total Beneficiaries</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 text-center border-success">
            <Card.Body>
              <FileEarmark size={40} className="text-success mb-2" />
              <h4 className="text-success">
                {statsLoading ? <Spinner size="sm" /> : statistics?.totalUsers || 0}
              </h4>
              <small className="text-muted">System Users</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 text-center border-info">
            <Card.Body>
              <GeoAlt size={40} className="text-info mb-2" />
              <h4 className="text-info">
                {statsLoading ? <Spinner size="sm" /> : statistics?.provinces?.length || 0}
              </h4>
              <small className="text-muted">Provinces Covered</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 text-center border-warning">
            <Card.Body>
              <BarChart size={40} className="text-warning mb-2" />
              <h4 className="text-warning">
                {statsLoading ? <Spinner size="sm" /> : statistics?.totalProjectSeries || 0}
              </h4>
              <small className="text-muted">Project Series</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Statistics */}
      <Row className="mb-4">
        {/* Project Series Breakdown */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <strong><FileEarmark className="me-2" />Top Project Series</strong>
            </Card.Header>
            <Card.Body>
              {statsLoading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" />
                </div>
              ) : (
                <div>
                  {statistics?.projectSeries?.slice(0, 5).map((item, idx) => {
                    const percentage = statistics.totalBeneficiaries > 0
                      ? (item.count / statistics.totalBeneficiaries * 100)
                      : 0;
                    return (
                      <div key={idx} className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="fw-bold">{item.project_series || 'Unknown'}</small>
                          <Badge bg="primary">{item.count.toLocaleString()}</Badge>
                        </div>
                        <ProgressBar
                          now={percentage}
                          variant="primary"
                          style={{ height: '6px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Top Provinces */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <strong><GeoAlt className="me-2" />Top Provinces</strong>
            </Card.Header>
            <Card.Body>
              {statsLoading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" />
                </div>
              ) : (
                <div>
                  {statistics?.provinces?.slice(0, 5).map((item, idx) => {
                    const percentage = statistics.totalBeneficiaries > 0
                      ? (item.count / statistics.totalBeneficiaries * 100)
                      : 0;
                    return (
                      <div key={idx} className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="fw-bold">{item.province || 'Unknown'}</small>
                          <Badge bg="info">{item.count.toLocaleString()}</Badge>
                        </div>
                        <ProgressBar
                          now={percentage}
                          variant="info"
                          style={{ height: '6px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Demographics and Age Statistics */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <strong><PieChart className="me-2" />Gender Distribution</strong>
            </Card.Header>
            <Card.Body>
              {statsLoading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" />
                </div>
              ) : (
                <Row>
                  {statistics?.genderDistribution?.map((item, idx) => (
                    <Col md={6} key={idx} className="text-center mb-3">
                      <h4 className={idx === 0 ? "text-primary" : "text-success"}>
                        {item.count.toLocaleString()}
                      </h4>
                      <small className="text-muted">{item.sex || 'Unknown'}</small>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <strong><Calendar className="me-2" />Age Statistics</strong>
            </Card.Header>
            <Card.Body>
              {statsLoading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" />
                </div>
              ) : statistics?.ageStats ? (
                <Row>
                  <Col md={4} className="text-center mb-3">
                    <h5 className="text-primary">{Math.round(statistics.ageStats.avg_age || 0)}</h5>
                    <small className="text-muted">Average Age</small>
                  </Col>
                  <Col md={4} className="text-center mb-3">
                    <h5 className="text-success">{statistics.ageStats.min_age || 0}</h5>
                    <small className="text-muted">Minimum Age</small>
                  </Col>
                  <Col md={4} className="text-center mb-3">
                    <h5 className="text-warning">{statistics.ageStats.max_age || 0}</h5>
                    <small className="text-muted">Maximum Age</small>
                  </Col>
                </Row>
              ) : (
                <p className="text-muted text-center">No age data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Action Buttons */}
      <Row>
        <Col md={6} className="mb-3">
          <Button
            variant="primary"
            size="lg"
            className="w-100"
            onClick={() => navigate("/admin/users")}
          >
            <People className="me-2" />
            Manage Users
          </Button>
        </Col>
        <Col md={6} className="mb-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-100"
            onClick={() => navigate("/admin/database")}
          >
            <FileEarmark className="me-2" />
            View Database
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
