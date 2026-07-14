import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Stamped at build time so the footer can show which deploy is
    // actually running — the one reliable way to spot a stale cached
    // bundle (a support issue we hit twice).
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    ),
  },
});
