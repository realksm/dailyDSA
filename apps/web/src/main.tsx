import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/800.css";
import "./styles.css";
import { App } from "./App";
import { AuthProvider } from "./auth";
import { ConfirmProvider } from "./components/Confirm";
import { RouterProvider } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </RouterProvider>
  </StrictMode>,
);
