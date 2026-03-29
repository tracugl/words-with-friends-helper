import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Apply persisted theme before first render to prevent flash
try {
  const saved = localStorage.getItem("wwfh-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
} catch {}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
