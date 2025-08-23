import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "", rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.password) {
      return setError("Please enter username and password.");
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4000/auth/login", {
        username: form.username,
        password: form.password,
      });

      const { token, user } = res.data;

      // Save token + role + username to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("username", user.username);

      // Redirect based on role
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (user.role === "client") {
        navigate("/client", { replace: true });
      } else {
        setError("Unknown role, cannot redirect.");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}
    >
      <div className="card p-4 shadow" style={{ width: "100%", maxWidth: "400px" }}>
        {/* Top Image */}
        <div className="text-center mb-3">
          <img
            src="./images/dole-logo.svg"
            alt="Site Logo"
            style={{ width: "80px", height: "80px", objectFit: "cover" }}
          />
        </div>

        {/* Site Name */}
        <h3 className="text-center mb-4">DOLE-TUPAD Validator</h3>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              className="form-control"
              name="username"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              className="form-control"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="rememberMe"
              name="rememberMe"
              checked={form.rememberMe}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="rememberMe">
              Remember me
            </label>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
