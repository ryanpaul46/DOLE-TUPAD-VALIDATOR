import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { InfoCircle, Shield, Upload, Search, Database as DatabaseIcon } from 'react-bootstrap-icons';

export default function About() {
  return (
    <Container fluid className="p-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <div className="text-center mb-5">
            <img 
              src="/dole-logo-ro1.svg" 
              alt="DOLE Logo" 
              style={{ width: "100px", height: "100px", objectFit: "contain" }} 
              className="mb-3"
            />
            <h1 className="display-5 fw-bold text-primary">DOLE RO1 - TUPAD Validator</h1>
            <p className="lead text-muted">
              Streamlining beneficiary data management for the Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers Program
            </p>
          </div>

          <Row className="g-4 mb-5">
            <Col md={6}>
              <Card className="h-100 border-primary">
                <Card.Header className="bg-primary text-white">
                  <InfoCircle className="me-2" />
                  About the System
                </Card.Header>
                <Card.Body>
                  <p>
                    The DOLE TUPAD Validator is a comprehensive data management system designed to help 
                    DOLE Regional Office 1 efficiently process and validate beneficiary records for the 
                    TUPAD program.
                  </p>
                  <p className="mb-0">
                    Our system ensures data integrity, prevents duplicate entries, and provides 
                    powerful tools for managing large datasets of program beneficiaries.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100 border-success">
                <Card.Header className="bg-success text-white">
                  <Shield className="me-2" />
                  Key Features
                </Card.Header>
                <Card.Body>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <Badge bg="success" className="me-2">✓</Badge>
                      Smart duplicate detection with 83% accuracy threshold
                    </li>
                    <li className="mb-2">
                      <Badge bg="success" className="me-2">✓</Badge>
                      Secure Excel file upload and processing
                    </li>
                    <li className="mb-2">
                      <Badge bg="success" className="me-2">✓</Badge>
                      Advanced search and filtering capabilities
                    </li>
                    <li className="mb-0">
                      <Badge bg="success" className="me-2">✓</Badge>
                      Role-based access control (Admin/Client)
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-4 mb-5">
            <Col md={4}>
              <Card className="text-center h-100">
                <Card.Body>
                  <Upload size={48} className="text-primary mb-3" />
                  <h5>Smart Upload</h5>
                  <p className="text-muted">
                    Upload Excel files with intelligent duplicate detection and validation
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center h-100">
                <Card.Body>
                  <Search size={48} className="text-success mb-3" />
                  <h5>Duplicate Detection</h5>
                  <p className="text-muted">
                    Advanced algorithms to identify potential duplicate beneficiaries
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center h-100">
                <Card.Body>
                  <DatabaseIcon size={48} className="text-info mb-3" />
                  <h5>Data Management</h5>
                  <p className="text-muted">
                    Comprehensive tools for managing and organizing beneficiary data
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">About TUPAD Program</h5>
            </Card.Header>
            <Card.Body>
              <p>
                The Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers (TUPAD) is a 
                community-based package of assistance that provides emergency employment for displaced 
                workers, underemployed and seasonal workers, for a minimum period of 10 days, but not 
                to exceed 30 days, depending on the nature of work to be performed.
              </p>
              <Row className="mt-4">
                <Col md={6}>
                  <h6 className="text-primary">Program Objectives:</h6>
                  <ul>
                    <li>Provide temporary employment opportunities</li>
                    <li>Augment family income of displaced workers</li>
                    <li>Develop community infrastructure and services</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6 className="text-success">Target Beneficiaries:</h6>
                  <ul>
                    <li>Displaced workers</li>
                    <li>Underemployed individuals</li>
                    <li>Seasonal workers</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">System Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p><strong>Version:</strong> 1.0.0</p>
                  <p><strong>Last Updated:</strong> December 2024</p>
                  <p><strong>Technology:</strong> React + Node.js + PostgreSQL</p>
                </Col>
                <Col md={6}>
                  <p><strong>Developed for:</strong> DOLE Regional Office 1</p>
                  <p><strong>Security:</strong> JWT Authentication, Input Validation</p>
                  <p><strong>File Support:</strong> Excel (.xlsx, .xls) up to 50MB</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}