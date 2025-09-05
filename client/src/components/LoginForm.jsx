import { useState } from 'react';
import api from '../api/axios';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';


export default function LoginForm() {
const [usernameOrEmail, setUE] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
const navigate = useNavigate();


async function handleSubmit(e) {
e.preventDefault();
setError('');
setIsLoading(true);
try {
const { data } = await api.post('/auth/login', { username: usernameOrEmail, password });
localStorage.setItem('token', data.token);
localStorage.setItem('csrfToken', data.csrfToken);

// Show loading screen for 2 seconds before navigation
setTimeout(() => {
if (data.user.role === 'admin') navigate('/admin');
else navigate('/client');
}, 2000);
} catch (e) {
setIsLoading(false);
setError(e?.response?.data?.message || 'Login failed');
}
}


if (isLoading) {
return <LoadingScreen message="Welcome! Preparing your dashboard..." />;
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