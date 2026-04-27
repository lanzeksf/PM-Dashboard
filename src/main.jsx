import React from "react";
import ReactDOM from "react-dom/client";
import KSFCommandCenter from "./shell/Shell.jsx";
import { KernBotApp } from "./kernbot/KernBotApp.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <KSFCommandCenter KernBotApp={KernBotApp} />
  </React.StrictMode>
);
