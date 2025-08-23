import { useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import { Navbar, Container, Nav } from "react-bootstrap";

export default function Header({ title = "Dashboard", role = "client" }) {
  const navigate = useNavigate();
  const homePath = role === "admin" ? "/admin" : "/client";

  return (
    <Navbar expand="lg" bg="primary" variant="dark" className="px-3">
      <Container fluid>
        <Navbar.Brand
          role="button"
          aria-label="Navigate to dashboard"
          onClick={() => navigate(homePath)}
          style={{ cursor: "pointer" }}
        >
          {title}
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="header-navbar-nav" />
        <Navbar.Collapse id="header-navbar-nav" className="justify-content-end">
          <Nav>
            <LogoutButton />
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
