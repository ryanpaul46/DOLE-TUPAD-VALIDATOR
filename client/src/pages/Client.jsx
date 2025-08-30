import { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Table, Card, Row, Col, Button, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Client() {
  const [data, setData] = useState([]);
  const [uniqueCounts, setUniqueCounts] = useState({});
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/api/beneficiaries-by-project-series");
      setData(res.data.projectSeries || []);
      setUniqueCounts(res.data.uniqueCounts || {});
    } catch (err) {
      setError("Failed to load project series data. Please try again later.");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalBeneficiaries = useMemo(() => {
    return data.reduce((sum, item) => sum + parseInt(item.beneficiary_count || 0, 10), 0);
  }, [data]);

  const handleDuplicateCheck = useCallback(() => {
    navigate('/client/duplicate-check');
  }, [navigate]);

  const handleViewDatabase = useCallback(() => {
    navigate('/client/database');
  }, [navigate]);

  return (
    <Container fluid className="p-4 flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
      <h2>Project Series Breakdown</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Total Project Series</Card.Title>
              <Card.Text className="display-4">{data.length}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Total Beneficiaries</Card.Title>
              <Card.Text className="display-4">{totalBeneficiaries}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Municipalities</Card.Title>
              <Card.Text className="display-4">{uniqueCounts.total_unique_municipalities || 0}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Barangays</Card.Title>
              <Card.Text className="display-4">{uniqueCounts.total_unique_barangay || 0}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Project Series Table */}
      <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Project Series</th>
              <th>Number of Beneficiaries</th>
              <th>Municipalities Covered</th>
              <th>Barangays Covered</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={`project-${item.project_series || idx}`}>
                <td>{item.project_series || 'Unknown'}</td>
                <td>{item.beneficiary_count || 0}</td>
                <td>{item.municipality_count || 0}</td>
                <td>{item.total_unique_barangay || 0}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      
      {data.length === 0 && (
        <div className="text-center mt-4">
          <p>No project series data available. Please upload beneficiary data first.</p>
        </div>
      )}
      
      {/* Quick Actions */}
      <Row className="mt-4">
        <Col md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Check for Duplicates</Card.Title>
              <Card.Text>Upload an Excel file to check for duplicate beneficiaries</Card.Text>
              <Button 
                variant="primary" 
                onClick={handleDuplicateCheck}
              >
                Start Duplicate Check
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>View Database</Card.Title>
              <Card.Text>Browse and search the complete beneficiary database</Card.Text>
              <Button 
                variant="secondary" 
                onClick={handleViewDatabase}
              >
                Browse Database
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
