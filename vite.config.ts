import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    fs: {
      allow: [
        // Allow Vite to access the workspace directory
        "/home/runner/workspace"
      ]
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
