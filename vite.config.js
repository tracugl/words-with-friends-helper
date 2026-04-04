import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all network interfaces so the dev server is reachable on the
    // local network (e.g. from other devices or via a remote tunnel), not
    // just from localhost.
    host: "0.0.0.0",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
