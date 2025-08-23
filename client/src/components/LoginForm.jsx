import { useState } from 'react';
import api from '../api/axios';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';


export default function LoginForm() {
const [usernameOrEmail, setUE] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const navigate = useNavigate();


async function handleSubmit(e) {
e.preventDefault();
setError('');
try {
const { data } = await api.post('/auth/login', { usernameOrEmail, password });
localStorage.setItem('token', data.token);
if (data.user.role === 'admin') navigate('/admin');
else navigate('/client');
} catch (e) {
setError(e?.response?.data?.message || 'Login failed');
}
}


return (
<Card className="shadow-lg">
<Card.Body>
<h3 className="mb-3 text-center">DOLE-CPFO TUPAD Validator</h3>
<Form onSubmit={handleSubmit}>
{error && <Alert variant="danger">{error}</Alert>}
<Form.Group className="mb-3">
<Form.Label>Username or Email</Form.Label>
<Form.Control
value={usernameOrEmail}
onChange={(e) => setUE(e.target.value)}
placeholder="Enter your username or email"
required
/>
</Form.Group>
<Form.Group className="mb-3">
<Form.Label>Password</Form.Label>
<Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
</Form.Group>
<div className="d-grid">
<Button type="submit">Login</Button>
</div>
</Form>
</Card.Body>
</Card>
);
}