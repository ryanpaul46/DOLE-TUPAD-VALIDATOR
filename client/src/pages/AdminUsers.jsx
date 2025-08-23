import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  Table,
  Button,
  Spinner,
  Alert,
  Modal,
  Form,
} from "react-bootstrap";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formUser, setFormUser] = useState({
    id: null,
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "client",
  });

  const navigate = useNavigate();

  // redirect if no token
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to fetch users";
      setError(msg);
      console.error("GET /users failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to delete user";
      alert(msg);
      console.error("DELETE /users/:id failed:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // update
        const res = await api.put(`/users/${formUser.id}`, formUser, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === formUser.id ? res.data : u))
        );
      } else {
        // create
        const res = await api.post("/users", formUser, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUsers((prev) => [...prev, res.data]);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        (isEditing ? "Failed to update user" : "Failed to create user");
      alert(msg);
      console.error("User save failed:", err);
    }
  };

  const handleAdd = () => {
    resetForm();
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setFormUser(user);
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormUser({
      id: null,
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      role: "client",
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Manage Users</h2>
        <Button variant="primary" onClick={handleAdd}>
          Add New User
        </Button>
      </div>

      {loading && (
        <div className="d-flex justify-content-center my-4">
          <Spinner animation="border" />
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th><th>First</th><th>Last</th><th>Username</th>
              <th>Email</th><th>Role</th><th>Actions</th><th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.first_name}</td>
                <td>{u.last_name}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => handleEdit(u)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </button>
                </td>
                <td>{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? "Edit User" : "Add User"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={formUser.username}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                name="first_name"
                value={formUser.first_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                name="last_name"
                value={formUser.last_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formUser.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            {!isEditing && (
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formUser.password}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                name="role"
                value={formUser.role}
                onChange={handleChange}
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Update" : "Save"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
