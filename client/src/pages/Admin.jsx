import { useState, useEffect } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [admin, setAdmin] = useState({ firstName: "", lastName: "" });
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Fetch logged-in admin info
  const fetchAdminInfo = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAdmin({
        firstName: data.first_name,
        lastName: data.last_name,
      });
    } catch (err) {
      console.error("Failed fetching admin info:", err);
    }
  };

  useEffect(() => {
    fetchAdminInfo();
  }, []);

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <h2>
            Welcome, {admin.firstName} {admin.lastName}
          </h2>
          <p>
            This is the admin dashboard where you can manage users and view
            reports.
          </p>
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
