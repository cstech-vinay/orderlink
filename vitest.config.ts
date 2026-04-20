import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: { provider: "v8", reporter: ["text", "html"] },
    passWithNoTests: true,
    // Serialize test files. Several DB-backed suites share orders_ref / inventory
    // rows and Postgres sequences; parallel execution races them. Cheap (suite
    // finishes in ~2s anyway) and buys deterministic runs.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
