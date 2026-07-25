import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { hardenVite } from "ui/harden/vite";

export default defineConfig({
  plugins: [react(), hardenVite({ repo: "mahajong" })],
  build: {
    outDir: "dist",
  },
  server: {
    open: true,
  },
  preview: {
    open: true,
  },
});
