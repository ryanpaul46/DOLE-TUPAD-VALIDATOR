import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../api/axios";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(true); // sidebar starts collapsed
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login"); // redirect to login if no token
        return;
      }

      try {
        const res = await api.get("/api/users/me");
        setRole(res.data.role);
      } catch (err) {
        console.error("Failed to fetch user role:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        navigate("/login"); // go back to login if token invalid
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  if (loading) {
    return <div className="d-flex vh-100 justify-content-center align-items-center">
      <h4>Loading...</h4>
    </div>;
  }

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <Sidebar role={role} collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <div
        className="flex-grow-1"
        style={{
          marginLeft: collapsed ? "70px" : "220px",
          transition: "margin-left 0.3s",
          minHeight: "100vh",
          backgroundColor: "#f4f6f9",
        }}
      >
        {/* Header */}
        <Header role={role} />

        {/* Page Content */}
        <div className="p-4">
          <Outlet context={{ role }} />
        </div>
      </div>
    </div>
  );
}
