import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Fix routing issues in production
export default defineConfig({
  plugins: [react()],
  base: "/", // Ensures proper routing
  server: {
    port: 5173, // Local dev server port
  },
  build: {
    outDir: "dist",
  },
});
