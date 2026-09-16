import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate config for the live-Supabase integration tests, which are
// excluded from the default `npm test` run (see vitest.config.ts) so the
// hermetic suite works on a fresh clone / CI / offline without network
// access or a .env file. Run these explicitly with `npm run test:integration`.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
