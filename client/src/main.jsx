import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// ❌ Do NOT wrap App in another <BrowserRouter> here if App already has it
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
