import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds ONE self-contained dist/index.html (all JS/CSS inlined) so the
// prototype runs offline by double-clicking the file, and on any static host.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
