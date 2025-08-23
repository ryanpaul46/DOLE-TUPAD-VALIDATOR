import { Navigate } from "react-router-dom";

export default function RequireAuth({ children, role }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" />;
  if (role && role !== userRole) return <Navigate to="/login" />;

  return children;
}
