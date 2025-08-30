import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const t = (key) => {
  const translations = {
    username: "Username",
    password: "Password",
    rememberMe: "Remember me",
    login: "Login",
    loggingIn: "Logging in...",
    enterCredentials: "Please enter username and password.",
    loginFailed: "Login failed",
    unknownRole: "Unknown role, cannot redirect."
  };
  return translations[key] || key;
};

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "", rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const navigateByRole = (role) => {
    const routes = { admin: "/admin", client: "/client" };
    if (routes[role]) {
      navigate(routes[role], { replace: true });
    } else {
      setError(t("unknownRole"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.password) {
      return setError(t("enterCredentials"));
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      
      if (!res.data || !res.data.token || !res.data.user) {
        throw new Error("Invalid response format");
      }
      
      const { token, user } = res.data;
      
      if (!user.role || !user.username) {
        throw new Error("Missing user data");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("username", user.username);

      navigateByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <div className="card p-4 shadow" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="text-center mb-3">
          <img src="/dole-logo.svg" alt="Site Logo" style={{ width: "80px", height: "80px", objectFit: "cover" }} />
        </div>
        <h3 className="text-center mb-4">DOLE-TUPAD Validator</h3>
        <p className="tagline text-center">“Your easy way to check TUPAD records.”</p>
        <h1 className="h5 text-center mb-4">Login to your account</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">{t("username")}</label>
            <input id="username" className="form-control" name="username" placeholder="Enter your username" value={form.username} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">{t("password")}</label>
            <input id="password" className="form-control" name="password" type="password" placeholder="Enter your password" value={form.password} onChange={handleChange} required />
          </div>
          <div className="form-check mb-3">
            <input type="checkbox" className="form-check-input" id="rememberMe" name="rememberMe" checked={form.rememberMe} onChange={handleChange} />
            <label className="form-check-label" htmlFor="rememberMe">{t("rememberMe")}</label>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? t("loggingIn") : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
}
