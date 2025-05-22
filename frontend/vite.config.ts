import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(),
    base: './',
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@deck.gl/widgets": path.resolve(__dirname, "./empty-deckgl-widgets.js"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  base: '/',
  optimizeDeps: {
    include: ['react-day-picker'],
  },
}));
