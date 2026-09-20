import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate config for the live-Supabase integration tests, which are
// excluded from the default `npm test` run (see vitest.config.ts) so the
// hermetic suite works on a fresh clone / CI / offline without network
// access or a .env file. Run these explicitly with `npm run test:integration`.
export default defineConfig({
  plugins: [react()],
  // Vite only loads env vars prefixed with `envPrefix` (default `VITE_`) into
  // process.env. The integration tests also need SUPABASE_SERVICE_ROLE_KEY,
  // which is deliberately un-prefixed so it's never exposed to browser code.
  envPrefix: ['VITE_', 'SUPABASE_'],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
  },
});
