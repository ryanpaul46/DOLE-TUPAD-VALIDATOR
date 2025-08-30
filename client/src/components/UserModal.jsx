import { useState } from "react";

export default function UserModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    role: "client", // default role
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Create New User</h3>
        <form onSubmit={handleSubmit}>
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            name="first_name"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
          />
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            name="last_name"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
          />
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={formData.role} onChange={handleChange}>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>

          <button type="submit">Create User</button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
