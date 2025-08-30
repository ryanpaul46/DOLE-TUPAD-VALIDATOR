import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Table, Button, Spinner, Alert, Modal, Form, Toast,} from "react-bootstrap";

const INITIAL_FORM_STATE = {
  id: null,
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "client",
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formUser, setFormUser] = useState(INITIAL_FORM_STATE);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("info");

  const navigate = useNavigate();

  const getToken = useCallback(() => {
    try {
      return localStorage.getItem("token");
    } catch (error) {
      return null;
    }
  }, []);

  const showNotification = useCallback((message, variant = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  }, []);

  // redirect if no token
  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate, getToken]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/users");
      const userData = Array.isArray(res.data) ? res.data : [];
      setUsers(userData);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to fetch users";
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteClick = useCallback((user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!userToDelete) return;
    
    try {
      await api.delete(`/api/users/${userToDelete.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showNotification("User deleted successfully", "success");
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to delete user";
      showNotification(msg, "danger");
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  }, [userToDelete, showNotification]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormUser((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const res = await api.put(`/api/users/${formUser.id}`, formUser);
        setUsers((prev) =>
          prev.map((u) => (u.id === formUser.id ? res.data : u))
        );
        showNotification("User updated successfully", "success");
      } else {
        const res = await api.post("/api/users", formUser);
        setUsers((prev) => [...prev, res.data]);
        showNotification("User created successfully", "success");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        (isEditing ? "Failed to update user" : "Failed to create user");
      showNotification(msg, "danger");
    }
  }, [isEditing, formUser, showNotification]);

  const handleAdd = useCallback(() => {
    resetForm();
    setIsEditing(false);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((user) => {
    setFormUser(user);
    setIsEditing(true);
    setShowModal(true);
  }, []);

  const resetForm = useCallback(() => {
    setFormUser(INITIAL_FORM_STATE);
  }, []);

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
            {Array.isArray(users) && users.length > 0 ? (
              users.map((u) => (
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
                      onClick={() => handleDeleteClick(u)}
                    >
                      Delete
                    </button>
                  </td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  No users found
                </td>
              </tr>
            )}
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notifications */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide bg={toastVariant}>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </div>
    </div>
  );
}
