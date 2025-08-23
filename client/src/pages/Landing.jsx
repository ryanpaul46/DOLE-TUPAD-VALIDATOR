import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';


export default function Landing() {
const navigate = useNavigate();
return (
<Container className="py-5">
<Row className="justify-content-center">
<Col md={8} lg={6}>
<h1 className="text-center mb-4">DOLE-CPFO TUPAD Validator</h1>
<div className="d-grid gap-3">

<Button size="lg" variant="outline-primary" onClick={() => navigate('/client')}>Go to Client Page</Button>
<Button size="lg" variant="outline-secondary" onClick={() => navigate('/admin')}>Go to Admin Page</Button>
</div>
</Col>
</Row>
</Container>
);
}