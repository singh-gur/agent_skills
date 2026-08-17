#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function isPiPackageRoot(path) {
  const packageFile = join(path, "package.json");
  if (!existsSync(packageFile)) return false;

  try {
    return JSON.parse(readFileSync(packageFile, "utf8")).name
      === "@earendil-works/pi-coding-agent";
  } catch {
    return false;
  }
}

export function findPiPackageRoot() {
  if (process.env.PI_PACKAGE_DIR) {
    const configured = resolve(process.env.PI_PACKAGE_DIR);
    if (isPiPackageRoot(configured)) return configured;
  }

  const command = process.platform === "win32" ? "where" : "which";
  let executable;

  try {
    executable = execFileSync(command, ["pi"], { encoding: "utf8" })
      .split(/\r?\n/, 1)[0]
      .trim();
  } catch {
    throw new Error("Cannot locate Pi. Ensure the pi command is available.");
  }

  const root = dirname(dirname(realpathSync(executable)));
  if (!isPiPackageRoot(root)) {
    throw new Error(
      "The pi command is not an npm-installed @earendil-works/pi-coding-agent package.",
    );
  }

  return root;
}

export function rankModelMatches(models, query, fuzzyFilter, limit = 10) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) throw new Error("--query must be a non-empty string.");

  const canonicalMatches = models.filter(
    (model) => `${model.provider}/${model.id}`.toLowerCase() === normalized,
  );
  const idMatches = models.filter(
    (model) => model.id.toLowerCase() === normalized,
  );
  const exact = canonicalMatches.length === 1
    ? canonicalMatches[0]
    : idMatches.length === 1
      ? idMatches[0]
      : undefined;

  return fuzzyFilter(
    models,
    query,
    (model) => {
      const name = model.name ? ` ${model.name}` : "";
      return `${model.provider} ${model.provider}/${model.id} ${model.provider} ${model.id}${name}`;
    },
  )
    .slice(0, limit)
    .map((model) => ({ model, exact: model === exact }));
}

export function describeMatches(
  ranked,
  getSupportedThinkingLevels,
  clampThinkingLevel,
  preferredThinking,
) {
  return ranked.map(({ model, exact }) => ({
    model: `${model.provider}/${model.id}`,
    name: model.name,
    exact,
    thinkingLevels: getSupportedThinkingLevels(model),
    ...(preferredThinking
      ? { preferredThinking: clampThinkingLevel(model, preferredThinking) }
      : {}),
  }));
}

function parseArguments(argv) {
  const [command, ...tokens] = argv;
  const values = {};

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];

    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near '${flag ?? ""}'.`);
    }

    values[flag.slice(2)] = value;
  }

  return { command, values };
}

async function loadPiModules() {
  const root = findPiPackageRoot();
  const dependencyRoot = join(root, "node_modules", "@earendil-works");

  const pi = await import(pathToFileURL(join(root, "dist", "index.js")));
  const ai = await import(
    pathToFileURL(join(dependencyRoot, "pi-ai", "dist", "compat.js"))
  );
  const tui = await import(
    pathToFileURL(join(dependencyRoot, "pi-tui", "dist", "index.js"))
  );

  return {
    ModelRuntime: pi.ModelRuntime,
    fuzzyFilter: tui.fuzzyFilter,
    getSupportedThinkingLevels: ai.getSupportedThinkingLevels,
    clampThinkingLevel: ai.clampThinkingLevel,
  };
}

async function main() {
  const { command, values } = parseArguments(process.argv.slice(2));
  if (command !== "search") throw new Error("Expected command: search.");
  if (!values.query?.trim()) throw new Error("--query is required.");

  const limit = values.limit === undefined ? 10 : Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("--limit must be an integer from 1 to 20.");
  }

  const {
    ModelRuntime,
    fuzzyFilter,
    getSupportedThinkingLevels,
    clampThinkingLevel,
  } = await loadPiModules();

  const signal = AbortSignal.timeout(15_000);
  const runtime = await ModelRuntime.create({ signal });
  const models = runtime.getModels();
  const ranked = rankModelMatches(models, values.query, fuzzyFilter, limit);

  console.log(JSON.stringify({
    query: values.query,
    matches: describeMatches(
      ranked,
      getSupportedThinkingLevels,
      clampThinkingLevel,
      values["preferred-thinking"],
    ),
  }, null, 2));
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(`agent-loadout: ${error.message}`);
    process.exitCode = 1;
  });
}
