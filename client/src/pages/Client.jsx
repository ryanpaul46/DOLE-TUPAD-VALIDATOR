import { useState, useEffect } from "react";
import { Container, Table, Card, Row, Col } from "react-bootstrap";
import api from "../api/axios";

export default function ClientDatabase() {
  const [data, setData] = useState([]);
  const [uniqueCounts, setUniqueCounts] = useState({
    total_unique_municipalities: 0,
    total_unique_provinces: 0
  });

  const fetchData = async () => {
    try {
      const res = await api.get("/api/beneficiaries-by-project-series");
      setData(res.data.projectSeries);
      setUniqueCounts(res.data.uniqueCounts);
    } catch (err) {
      console.error("Failed fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate totals for summary card
  const totalBeneficiaries = data.reduce((sum, item) => sum + parseInt(item.beneficiary_count), 0);

  return (
    <Container fluid className="p-4 flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
      <h2>Project Series Breakdown</h2>
      
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
              <Card.Text className="display-4">{uniqueCounts.total_unique_municipalities}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Provinces</Card.Title>
              <Card.Text className="display-4">{uniqueCounts.total_unique_provinces}</Card.Text>
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
              <th>Provinces Covered</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>{item.project_series}</td>
                <td>{item.beneficiary_count}</td>
                <td>{item.municipality_count}</td>
                <td>{item.province_count}</td>
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
    </Container>
  );
}
