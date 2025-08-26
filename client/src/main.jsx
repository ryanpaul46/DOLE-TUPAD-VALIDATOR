import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // <-- import JS directly

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
// ❌ Do NOT wrap App in another <BrowserRouter> here if App already has it
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
