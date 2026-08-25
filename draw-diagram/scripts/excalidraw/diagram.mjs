import fs from "node:fs/promises";
import path from "node:path";
import { withExcalidrawPage } from "./lib/browser.mjs";
import { computeLayout } from "./lib/layout.mjs";
import { routeEdges } from "./lib/route.mjs";
import { buildScene } from "./lib/scene.mjs";
import { loadIcons, loadSpec } from "./lib/spec.mjs";
import { resolveTheme } from "./lib/theme.mjs";

function usage() {
  return `Usage: npm run diagram -- <spec.json> [options]

Options:
  --scene <path>       Output .excalidraw scene (default: <spec dir>/<name>.excalidraw)
  --png <path>         Output PNG (default: alongside the scene)
  --no-png             Write the scene only
  --scale <number>     Export scale from 0.25 to 4 (default: 2)
  --padding <pixels>   Export padding from 0 to 256 (default: 32)
  --background <color> Background color (default: #ffffff)
  --help               Show this help`;
}

function parseNumber(name, value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = { scale: 2, padding: 32, background: "#ffffff", png: true };
  let spec = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return { help: true };
    else if (arg === "--scene") options.scenePath = argv[++index];
    else if (arg === "--png") options.pngPath = argv[++index];
    else if (arg === "--no-png") options.png = false;
    else if (arg === "--scale") options.scale = parseNumber("scale", argv[++index], 0.25, 4);
    else if (arg === "--padding") options.padding = parseNumber("padding", argv[++index], 0, 256);
    else if (arg === "--background") options.background = argv[++index];
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else if (spec) throw new Error("Expected a single spec file");
    else spec = arg;
  }
  if (!spec) throw new Error("Expected a diagram spec file");

  const base = spec.replace(/\.(spec\.)?json$/i, "");
  return {
    specPath: path.resolve(spec),
    scenePath: path.resolve(options.scenePath ?? `${base}.excalidraw`),
    pngPath: options.png ? path.resolve(options.pngPath ?? `${base}.png`) : null,
    options,
    help: false,
  };
}

async function main(args) {
  const spec = await loadSpec(args.specPath);
  // Label masks paint over connectors, so they must match the export background.
  const theme = resolveTheme({
    ...spec,
    colors: { canvas: args.options.background, ...(spec.colors ?? {}) },
  });
  const icons = await loadIcons(spec);

  const result = await withExcalidrawPage(async (page) => {
    await page.evaluate(
      (families) => window.dd.ready(families),
      [...new Set([theme.fontFamily, theme.edgeFontFamily])],
    );
    const measure = (requests) =>
      page.evaluate((batch) => window.dd.measure(batch), requests);

    const layout = await computeLayout(spec, theme, measure);
    const edges = routeEdges({
      nodes: layout.nodes,
      edges: spec.edges ?? [],
      channels: layout.channels,
      obstacles: layout.obstacles,
      groups: layout.groups,
      laneStep: theme.layout.laneStep,
    });
    const { skeleton, patches, warnings, files } = await buildScene({
      spec,
      theme,
      layout,
      edges,
      icons,
      measure,
    });

    const elements = await page.evaluate(
      ({ skeletonData, patchData }) => window.dd.build(skeletonData, patchData),
      { skeletonData: skeleton, patchData: patches },
    );

    const scene = {
      type: "excalidraw",
      version: 2,
      source: "draw-diagram/scripts/excalidraw",
      elements,
      appState: {
        gridSize: null,
        viewBackgroundColor: args.options.background,
        exportBackground: true,
        exportWithDarkMode: false,
        exportScale: args.options.scale,
      },
      files,
    };

    const report = await page.evaluate((sceneData) => window.dd.validate(sceneData), scene);
    if (report.dropped.length > 0) {
      warnings.push(`Excalidraw would drop on import: ${report.dropped.join(", ")}`);
    }
    if (report.missingFiles.length > 0) {
      warnings.push(`image elements without file data: ${report.missingFiles.join(", ")}`);
    }

    let png = null;
    if (args.pngPath) {
      const base64 = await page.evaluate(
        ({ sceneData, renderOptions }) => window.dd.renderPng(sceneData, renderOptions),
        { sceneData: scene, renderOptions: args.options },
      );
      png = Buffer.from(base64, "base64");
    }
    return { scene, png, warnings, report };
  });

  await fs.mkdir(path.dirname(args.scenePath), { recursive: true });
  await fs.writeFile(args.scenePath, `${JSON.stringify(result.scene, null, 2)}\n`);
  process.stdout.write(`${args.scenePath}\n`);
  if (result.png) {
    await fs.mkdir(path.dirname(args.pngPath), { recursive: true });
    await fs.writeFile(args.pngPath, result.png);
    process.stdout.write(`${args.pngPath}\n`);
  }
  for (const warning of result.warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
  if (result.warnings.length === 0) {
    process.stdout.write(`ok: ${result.report.restored} elements, no layout warnings\n`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) process.stdout.write(`${usage()}\n`);
  else await main(args);
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n\n${usage()}\n`);
  process.exitCode = 1;
}
