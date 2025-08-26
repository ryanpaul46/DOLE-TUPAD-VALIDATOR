import { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Admin() {
  const [admin, setAdmin] = useState({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch logged-in admin info
  const fetchAdminInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users/me"); // uses Axios instance with token
      const data = res.data;

      setAdmin({
        firstName: data.first_name,
        lastName: data.last_name,
      });
    } catch (err) {
      console.error("Failed fetching admin info:", err);
      setError(
        err.response?.data?.message || "Failed to fetch admin info. Please log in again."
      );
      // Redirect to login if unauthorized
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminInfo();
  }, []);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col>
          <h2>
            Welcome, {admin.firstName} {admin.lastName}
          </h2>
          <p>This is the admin dashboard where you can manage users and view reports.</p>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-3">
          <Button
            variant="primary"
            size="lg"
            className="w-100"
            onClick={() => navigate("/admin/users")}
          >
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
            View Database
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
