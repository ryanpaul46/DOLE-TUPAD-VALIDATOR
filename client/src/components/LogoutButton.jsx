import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear stored session data
    localStorage.removeItem("role");
    // (Optional) localStorage.removeItem("token");

    // Redirect to login
    navigate("/login", { replace: true });
  };

  return (
    <button
      className="btn btn-outline-light"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
}
