import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Boots the pinned Excalidraw bundle in a loopback-only Chromium page and hands
 * it to `run`. External requests are blocked so scenes never phone home.
 */
export async function withExcalidrawPage(run) {
  const server = await createServer({
    root: ROOT,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });

  let browser;
  try {
    await server.listen();
    const address = server.httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not determine the local renderer port");
    }
    const origin = `http://127.0.0.1:${address.port}`;

    // Playwright leaves Chromium's sandbox off by default. Ask for it, and fall
    // back only where the host cannot provide it (containers without user
    // namespaces), so a missing sandbox is visible rather than silent.
    try {
      browser = await chromium.launch({ headless: true, chromiumSandbox: true });
    } catch (sandboxError) {
      try {
        browser = await chromium.launch({ headless: true });
        process.stderr.write(
          `warning: Chromium sandbox unavailable, continuing without it (${sandboxError.message.split("\n")[0]})\n`,
        );
      } catch (error) {
        throw new Error(
          `Chromium is unavailable. From the renderer directory, after approval, run: npm exec -- playwright install chromium\n${error.message}`,
        );
      }
    }

    const pageErrors = [];
    // Route at the context so popups and workers are covered too; `page.route()`
    // reaches neither, nor does it see WebSocket or service worker traffic.
    const context = await browser.newContext({ colorScheme: "light", serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) await route.continue();
      else await route.abort("blockedbyclient");
    });
    // Same rule as the HTTP route, applied to sockets `context.route()` never
    // sees. Vite's own client socket is loopback, so it keeps working.
    await context.routeWebSocket(
      (url) => url.hostname !== "127.0.0.1",
      (ws) => ws.close(),
    );

    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });

    await page.goto(origin, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForFunction(() => window.excalidrawRendererReady === true, undefined, {
      timeout: 60_000,
    });

    const result = await run(page);
    if (pageErrors.length > 0) {
      throw new Error(`Browser renderer errors:\n${pageErrors.join("\n")}`);
    }
    return result;
  } finally {
    await Promise.allSettled([browser?.close(), server.close()]);
  }
}

export async function renderScene(page, scene, options) {
  const base64 = await page.evaluate(
    ({ sceneData, renderOptions }) => window.dd.renderPng(sceneData, renderOptions),
    { sceneData: scene, renderOptions: options },
  );
  return Buffer.from(base64, "base64");
}
