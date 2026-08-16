import { defineConfig } from 'vite';

// SPA history fallback plugin — rewrites non-file requests to /index.html
function spaFallback() {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // Skip API, socket.io, assets, and files with extensions
        if (url.startsWith('/api') || url.startsWith('/socket.io') ||
            url.startsWith('/@') || url.startsWith('/node_modules') ||
            url.startsWith('/src') || /\.\w+$/.test(url)) {
          return next();
        }
        req.url = '/index.html';
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [spaFallback()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
