import "@testing-library/jest-dom/vitest";

// Node 22+ ships a built-in (non-functional) localStorage global that shadows
// jsdom's. At setup time globalThis.jsdom has already been set by vitest's
// jsdom environment, so we can replace the broken stub with jsdom's real one.
const g = globalThis as Record<string, unknown>;
if (g.jsdom && typeof g.localStorage !== "undefined") {
  const jsdomStorage = (g.jsdom as { window: { localStorage: Storage } }).window.localStorage;
  Object.defineProperty(g, "localStorage", {
    configurable: true,
    writable: true,
    value: jsdomStorage,
  });
  Object.defineProperty(g, "sessionStorage", {
    configurable: true,
    writable: true,
    value: (g.jsdom as { window: { sessionStorage: Storage } }).window.sessionStorage,
  });
}
