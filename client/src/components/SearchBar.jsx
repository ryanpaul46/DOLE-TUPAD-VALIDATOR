import { Card, InputGroup, Form, Button, Row, Col } from 'react-bootstrap';

export default function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <Row className="mb-4">
      <Col>
        <Card>
          <Card.Header>Search</Card.Header>
          <Card.Body>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search for anything in the database..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchTerm && (
                <Button 
                  variant="outline-secondary" 
                  onClick={() => onSearchChange("")}
                >
                  Clear
                </Button>
              )}
            </InputGroup>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}