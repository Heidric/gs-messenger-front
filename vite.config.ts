import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8086",
        changeOrigin: true,
        ws: true,
      },
      "^/voice$": {
        target: "ws://localhost:8086",
        changeOrigin: true,
        ws: true,
      },
      "^/chat$": {
        target: "ws://localhost:8086",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
