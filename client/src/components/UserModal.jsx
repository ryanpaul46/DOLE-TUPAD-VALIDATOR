import { useState } from "react";

export default function UserModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    role: "client", // default role
    field_office: "",
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
          <input
            name="first_name"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
          />
          <input
            name="last_name"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
          />
          <input
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />
          <input
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
            <option value="validator">Validator</option> 
          </select>

          <select name="field_office" value={formData.field_office} onChange={handleChange}>
            <option value="">Select Field Office</option>
            <option value="INFO">Ilocos Norte Field Office</option>
            <option value="ISFO">Ilocos Sur Field Office</option>
            <option value="LUFO">La Union Field Office</option>
            <option value="EPFO">Eastern Pangasinan Field Office</option>
            <option value="WPFO">Western Pangasinan Field Office</option>
            <option value="CPFO">Central Pangasinan Field Office</option>
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
