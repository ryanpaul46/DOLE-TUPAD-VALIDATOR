import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTachometerAlt, FaUsers, FaDatabase, FaSearch } from "react-icons/fa";
import { useMemo, useCallback } from "react";
import PropTypes from "prop-types";

const sidebarStyles = {
  transition: "width 0.3s",
  height: "100vh",
  backgroundColor: "#f8f9fa",
  borderRight: "1px solid #dee2e6",
  position: "fixed",
  top: 0,
  left: 0,
  overflow: "hidden",
  zIndex: 1100,
};

const headerStyles = {
  fontWeight: "bold",
  cursor: "pointer",
  borderBottom: "1px solid #dee2e6",
};

const linkStyles = {
  padding: "0.75rem 1rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const iconStyles = {
  width: "20px",
  textAlign: "center",
};

export default function Sidebar({ role, collapsed, setCollapsed }) {
  const location = useLocation();

  const menuItems = useMemo(() => {
    return role === "admin"
      ? [
          { label: "Dashboard", path: "/admin", icon: <FaTachometerAlt /> },
          { label: "Manage Users", path: "/admin/users", icon: <FaUsers /> },
          { label: "Database", path: "/admin/database", icon: <FaDatabase /> },
          { label: "Duplicate Analysis", path: "/admin/duplicate-detection", icon: <FaSearch /> },
        ]
      : [
          { label: "Client Dashboard", path: "/client", icon: <FaTachometerAlt /> },
          { label: "Duplicate Check", path: "/client/duplicate-check", icon: <FaSearch /> },
          { label: "Database", path: "/client/database", icon: <FaDatabase /> },
        ];
  }, [role]);

  const handleToggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const handleMouseEnter = useCallback(() => {
    setCollapsed(false);
  }, [setCollapsed]);

  const handleMouseLeave = useCallback(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  const sidebarStyle = useMemo(() => ({
    ...sidebarStyles,
    width: collapsed ? "70px" : "220px",
  }), [collapsed]);

  return (
    <div
      className={`d-flex flex-column sidebar ${collapsed ? "collapsed" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={sidebarStyle}
    >
      {/* Sidebar Header */}
      <div
        className="p-3"
        style={headerStyles}
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
                style={linkStyles}
                title={item.label}
              >
                <span style={iconStyles}>{item.icon}</span>
                {!collapsed && <span className="ms-2">{item.label}</span>}
              </Link>
            </Nav.Item>
          );
        })}
      </Nav>
    </div>
  );
}

Sidebar.propTypes = {
  role: PropTypes.oneOf(["admin", "client"]).isRequired,
  collapsed: PropTypes.bool.isRequired,
  setCollapsed: PropTypes.func.isRequired,
};
