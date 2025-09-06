import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import ClientMain from "./pages/Client";
import Database from "./pages/Database";
import DetectDuplicate from "./pages/DetectDuplicate";
import SearchBeneficiaries from "./pages/SearchBeneficiaries";
import About from "./pages/About";
import Login from "./pages/Login";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Admin */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AppLayout role="admin" />}>
            <Route index element={<Admin />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="database" element={<Database />} />
            <Route path="search" element={<SearchBeneficiaries />} />
            <Route path="about" element={<About />} />
          </Route>
        </Route>

        {/* Client */}
        <Route element={<ProtectedRoute role="client" />}>
          <Route path="/client" element={<AppLayout role="client" />}>
            <Route index element={<ClientMain />} />
            <Route path="detect-duplicate" element={<DetectDuplicate />} />
            <Route path="database" element={<Database />} />
            <Route path="search" element={<SearchBeneficiaries />} />
            <Route path="about" element={<About />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
