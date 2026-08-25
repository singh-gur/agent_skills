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

    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      throw new Error(
        `Chromium is unavailable. From the renderer directory, after approval, run: npm exec -- playwright install chromium\n${error.message}`,
      );
    }

    const pageErrors = [];
    const page = await browser.newPage({ colorScheme: "light" });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) await route.continue();
      else await route.abort("blockedbyclient");
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
