import { defineConfig } from "@playwright/test";

// La prova nascosta sul dev server della sessione, con i risultati fuori da test-results/.
const PORT = Number(process.env.CHECK_PORT);

export default defineConfig({
  testDir: ".",
  outputDir: "./results",
  reporter: [["line"]],
  use: { baseURL: `http://localhost:${PORT}`, browserName: "chromium" },
  webServer: {
    command: `DEV_PORT=${PORT} node scripts/dev.mjs`,
    cwd: "..",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
