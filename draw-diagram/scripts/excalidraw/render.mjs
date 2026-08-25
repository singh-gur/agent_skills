import fs from "node:fs/promises";
import path from "node:path";
import { withExcalidrawPage } from "./lib/browser.mjs";
import { prepareOutput, writeFileNoFollow } from "./lib/safe-write.mjs";

const MAX_SCENE_BYTES = 25 * 1024 * 1024;
const MAX_ELEMENTS = 10_000;

function usage() {
  return `Usage: npm run render -- <input.excalidraw> [output.png] [options]

Options:
  --scale <number>       Export scale from 0.25 to 4 (default: 2)
  --padding <pixels>     Export padding from 0 to 256 (default: 32)
  --background <color>  Background color (default: #ffffff)
  --force                Allow an output path outside the current directory
  --help                 Show this help`;
}

function parseNumber(name, value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const positional = [];
  const options = { scale: 2, padding: 32, background: "#ffffff", force: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return { help: true };
    if (arg === "--scale") {
      options.scale = parseNumber("scale", argv[++index], 0.25, 4);
    } else if (arg === "--padding") {
      options.padding = parseNumber("padding", argv[++index], 0, 256);
    } else if (arg === "--background") {
      options.background = argv[++index];
      if (!options.background) throw new Error("background requires a color");
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 1 || positional.length > 2) {
    throw new Error("Expected an input scene and optional output path");
  }

  const input = path.resolve(positional[0]);
  const output = path.resolve(
    positional[1] ?? positional[0].replace(/\.excalidraw$/i, "") + ".png",
  );
  if (input === output) throw new Error("Refusing to overwrite the input scene with its render");
  return { input, output, options, help: false };
}

async function loadScene(input) {
  const stat = await fs.stat(input);
  if (stat.size > MAX_SCENE_BYTES) {
    throw new Error(`Scene exceeds ${MAX_SCENE_BYTES} bytes`);
  }

  const scene = JSON.parse(await fs.readFile(input, "utf8"));
  if (scene?.type !== "excalidraw" || !Array.isArray(scene.elements)) {
    throw new Error("Input is not an Excalidraw scene");
  }
  if (scene.elements.length > MAX_ELEMENTS) {
    throw new Error(`Scene exceeds ${MAX_ELEMENTS} elements`);
  }
  return scene;
}

async function render({ input, output, options }) {
  const scene = await loadScene(input);
  const target = await prepareOutput(output, { force: options.force });
  const png = await withExcalidrawPage(async (page) => {
    const base64 = await page.evaluate(
      ({ sceneData, renderOptions }) => window.dd.renderPng(sceneData, renderOptions),
      { sceneData: scene, renderOptions: options },
    );
    return Buffer.from(base64, "base64");
  });

  await writeFileNoFollow(target, png);
  process.stdout.write(`${target}\n`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) process.stdout.write(`${usage()}\n`);
  else await render(args);
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exitCode = 1;
}
