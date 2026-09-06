#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

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
    throw new Error("PI_PACKAGE_DIR must point to an npm-installed Pi package.");
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

  let root = dirname(realpathSync(executable));
  while (true) {
    if (isPiPackageRoot(root)) return root;
    const parent = dirname(root);
    if (parent === root) break;
    root = parent;
  }
  throw new Error(
    "The pi command is not inside an npm-installed Pi package. Set PI_PACKAGE_DIR for wrapper commands.",
  );
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

  if (exact) return [{ model: exact, exact: true }];

  // Keep a recognized provider qualifier from drifting to another provider.
  const provider = normalized.split("/", 1)[0];
  const candidates = normalized.includes("/") && models.some((model) => model.provider.toLowerCase() === provider)
    ? models.filter((model) => model.provider.toLowerCase() === provider)
    : models;
  return fuzzyFilter(
    candidates,
    query.trim(),
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

export function parseArguments(argv, allowedFlags, switches = []) {
  const [command, ...tokens] = argv;
  const values = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];
    const name = flag?.slice(2);
    if (!flag?.startsWith("--") || !allowedFlags.includes(name)) {
      throw new Error("Unknown option. Check the skill's helper command syntax.");
    }
    if (Object.hasOwn(values, name)) throw new Error(`Duplicate option: --${name}.`);
    if (switches.includes(name)) {
      values[name] = true;
    } else {
      const value = tokens[++index];
      if (value === undefined || value.startsWith("--")) throw new Error(`--${name} needs a value.`);
      values[name] = value;
    }
  }
  return { command, values };
}

export function validateRequests(requests) {
  if (!Array.isArray(requests) || requests.length < 1 || requests.length > 6) {
    throw new Error("Provide between one and six model requests.");
  }
  for (const request of requests) {
    if (!request || typeof request !== "object" || Array.isArray(request)
      || Object.keys(request).some((key) => !["query", "preferredThinking"].includes(key))
      || typeof request.query !== "string" || !request.query.trim()) {
      throw new Error("Each request needs a non-empty query and optional preferredThinking.");
    }
    if (/:(off|minimal|low|medium|high|xhigh|max|inherit)$/.test(request.query.trim())) {
      throw new Error("Supply thinking separately, not as a model suffix.");
    }
    if (request.preferredThinking !== undefined && !THINKING_LEVELS.includes(request.preferredThinking)) {
      throw new Error("Invalid preferred thinking level.");
    }
  }
  return requests;
}

export function searchModels(models, requests, helpers, limit = 10) {
  validateRequests(requests);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("--limit must be an integer from 1 to 20.");
  }
  return requests.map(({ query, preferredThinking }) => {
    const ranked = rankModelMatches(models, query, helpers.fuzzyFilter, Infinity);
    return {
      query,
      totalMatches: ranked.length,
      truncated: ranked.length > limit,
      matches: describeMatches(ranked.slice(0, limit), helpers.getSupportedThinkingLevels,
        helpers.clampThinkingLevel, preferredThinking),
    };
  });
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
  const command = process.argv[2];
  if (!["search", "batch"].includes(command)) throw new Error("Expected command: search or batch.");
  const { values } = parseArguments(process.argv.slice(2), command === "search"
    ? ["query", "preferred-thinking", "limit"] : ["requests", "limit"]);
  let requests;
  if (command === "search") {
    requests = [{ query: values.query, preferredThinking: values["preferred-thinking"] }];
  } else {
    try {
      requests = JSON.parse(values.requests);
    } catch {
      throw new Error("--requests must be a JSON array of model queries.");
    }
  }
  validateRequests(requests);
  const limit = values.limit === undefined ? 10 : Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("--limit must be an integer from 1 to 20.");
  }

  const helpers = await loadPiModules();
  let runtime;
  try {
    runtime = await helpers.ModelRuntime.create({ signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error("Model catalog discovery failed. Check Pi/provider setup; no settings were changed.");
  }
  const results = searchModels(runtime.getModels(), requests, helpers, limit);
  console.log(JSON.stringify({
    catalog: "standalone Pi catalog; session extension registrations are not loaded",
    launchVerified: false,
    ...(command === "search" ? results[0] : { results }),
  }, null, 2));
}

const isMain = process.argv[1]
  && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(`agent-loadout: ${error.message}`);
    process.exitCode = 1;
  });
}
