import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTachometerAlt, FaUsers, FaDatabase, FaSearch } from "react-icons/fa";

export default function Sidebar({ role, collapsed, setCollapsed }) {
  const location = useLocation();

  // Sidebar menu items
  const menuItems =
    role === "admin"
      ? [
          { label: "Dashboard", path: "/admin", icon: <FaTachometerAlt /> },
          { label: "Manage Users", path: "/admin/users", icon: <FaUsers /> },
          { label: "Database", path: "/admin/database", icon: <FaDatabase /> },
        ]
      : [
          { label: "Client Dashboard", path: "/client", icon: <FaTachometerAlt /> },
          { label: "Detect Duplicate", path: "/client/detect-duplicate", icon: <FaSearch /> },
          { label: "Database", path: "/client/database", icon: <FaDatabase /> },
        ];

  // Handle toggle explicitly
  const handleToggle = () => setCollapsed(!collapsed);

  return (
    <div
      className={`d-flex flex-column sidebar ${collapsed ? "collapsed" : ""}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      style={{
        width: collapsed ? "70px" : "220px",
        transition: "width 0.3s",
        height: "100vh",
        backgroundColor: "#f8f9fa",
        borderRight: "1px solid #dee2e6",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        zIndex: 1100,
      }}
    >
      {/* Sidebar Header */}
      <div
        className="p-3"
        style={{
          fontWeight: "bold",
          cursor: "pointer",
          borderBottom: "1px solid #dee2e6",
        }}
        onClick={handleToggle}
      >
        {collapsed ? <FaBars size={20} /> : "Menu"}
      </div>

      {/* Role Info */}
      {!collapsed && (
        <div className="role-info p-3 border-bottom">
          <strong>{role === "admin" ? "Admin" : "Client"}</strong>
        </div>
      )}

      {/* Navigation Links */}
      <Nav className="flex-column mt-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Nav.Item key={item.path}>
              <Link
                to={item.path}
                className={`d-flex align-items-center nav-link ${
                  isActive ? "active fw-bold" : ""
                }`}
                style={{
                  padding: "0.75rem 1rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={item.label}
              >
                <span style={{ width: "20px", textAlign: "center" }}>{item.icon}</span>
                {!collapsed && <span className="ms-2">{item.label}</span>}
              </Link>
            </Nav.Item>
          );
        })}
      </Nav>
    </div>
  );
}
