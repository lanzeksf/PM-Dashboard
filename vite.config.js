import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/projectsight-api": {
        target: "https://api-usw2.trimblepaas.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/projectsight-api/, ""),
      },
    },
  },
});
