#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findPiPackageRoot, parseArguments, THINKING_LEVELS } from "./model-options.mjs";

export const TIER_AGENTS = {
  T1: ["scout", "delegate"],
  T2: ["researcher", "worker"],
  T3: ["reviewer", "oracle"],
};
const AGENTS = Object.values(TIER_AGENTS).flat();

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isObject(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}

export function resolveTargets(target = "all") {
  if (target === "advisor") target = "oracle";
  if (target === "all") return [...AGENTS];
  if (Object.hasOwn(TIER_AGENTS, target)) return [...TIER_AGENTS[target]];
  if (AGENTS.includes(target)) return [target];
  throw new Error(`Expected target: all, T1, T2, T3, or one of ${AGENTS.join(", ")}.`);
}

export function mappedOverrides(settings) {
  requireObject(settings, "Settings root");
  if (settings.subagents === undefined) return {};
  const subagents = requireObject(settings.subagents, "subagents");
  if (subagents.agentOverrides === undefined) return {};
  const overrides = requireObject(subagents.agentOverrides, "subagents.agentOverrides");

  for (const agent of AGENTS) {
    if (overrides[agent] === undefined) continue;
    const label = `subagents.agentOverrides.${agent}`;
    const entry = requireObject(overrides[agent], label);
    if (entry.model !== undefined && entry.model !== false
      && (typeof entry.model !== "string" || !entry.model.trim())) {
      throw new Error(`${label}.model must be a non-empty string or false.`);
    }
    if (entry.thinking !== undefined && entry.thinking !== false
      && entry.thinking !== "inherit" && !THINKING_LEVELS.includes(entry.thinking)) {
      throw new Error(`${label}.thinking is invalid.`);
    }
  }
  return overrides;
}

function normalizePolicy(policy) {
  requireObject(policy, "Policy");
  if (Object.keys(policy).some((key) => !["model", "thinking"].includes(key))) {
    throw new Error("Policies may contain only model and thinking.");
  }
  if (typeof policy.model !== "string"
    || !/^[^\s/]+\/\S+$/.test(policy.model.trim())
    || /:(off|minimal|low|medium|high|xhigh|max|inherit)$/.test(policy.model.trim())) {
    throw new Error("Model must be a canonical provider/model without a thinking suffix.");
  }
  if (!THINKING_LEVELS.includes(policy.thinking)) {
    throw new Error(`Thinking must be one of: ${THINKING_LEVELS.join(", ")}.`);
  }
  return {
    model: policy.model.trim(),
    thinking: policy.thinking === "off" ? false : policy.thinking,
  };
}

export function setOverrides(settings, policies) {
  mappedOverrides(settings);
  requireObject(policies, "Policies");
  if (!Object.keys(policies).length) throw new Error("At least one policy is required.");
  const next = structuredClone(settings);
  next.subagents ??= {};
  next.subagents.agentOverrides ??= {};
  const overrides = next.subagents.agentOverrides;
  const selected = new Set();

  for (const [target, policy] of Object.entries(policies)) {
    const normalized = normalizePolicy(policy);
    for (const agent of resolveTargets(target)) {
      if (selected.has(agent)) throw new Error(`Overlapping policies for ${agent}.`);
      selected.add(agent);
      overrides[agent] = { ...overrides[agent], ...normalized };
    }
  }
  return next;
}

export function unsetOverrides(settings, target = "all") {
  mappedOverrides(settings);
  const agents = resolveTargets(target);
  const next = structuredClone(settings);
  const overrides = next.subagents?.agentOverrides;
  if (!overrides) return next;

  let removed = false;
  for (const agent of agents) {
    const entry = overrides[agent];
    if (entry?.model === undefined && entry?.thinking === undefined) continue;
    removed = true;
    delete entry.model;
    delete entry.thinking;
    if (!Object.keys(entry).length) delete overrides[agent];
  }
  if (removed && !Object.keys(overrides).length) delete next.subagents.agentOverrides;
  return next;
}

function revision(raw) {
  return raw === undefined ? "missing" : createHash("sha256").update(raw).digest("hex");
}

export function readSettings(file) {
  let stat;
  try {
    stat = lstatSync(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { exists: false, settings: {}, revision: "missing", mode: 0o600 };
  }
  if (stat.isSymbolicLink()) throw new Error("Settings symlinks are not supported; no file was changed.");
  if (!stat.isFile()) throw new Error("Settings path must be a regular file.");
  const raw = readFileSync(file, "utf8");
  let settings;
  try {
    settings = JSON.parse(raw);
  } catch {
    // JSON.parse errors can quote unrelated settings or credentials.
    throw new Error("Invalid settings JSON; contents withheld.");
  }
  mappedOverrides(settings);
  return { exists: true, settings, revision: revision(raw), mode: stat.mode & 0o777 };
}

export function updateSettings(file, transform, { expectedRevision, dryRun = false } = {}) {
  file = resolve(file);
  if (!dryRun && !expectedRevision) throw new Error("--expect from an approved preview is required.");
  const current = readSettings(file);
  if (expectedRevision !== undefined && expectedRevision !== current.revision) {
    throw new Error("Settings changed; preview again and obtain fresh approval.");
  }
  const next = transform(structuredClone(current.settings));
  mappedOverrides(next);
  const changed = JSON.stringify(next) !== JSON.stringify(current.settings);
  const result = { before: current.settings, after: next, revision: current.revision, changed, written: false };
  if (!changed || dryRun) return result;

  // Use the same library and lock options as Pi's settings writer.
  const require = createRequire(join(findPiPackageRoot(), "package.json"));
  const lockfile = require("proper-lockfile");
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const release = lockfile.lockSync(file, { realpath: false });
  let temporaryDir;
  try {
    const locked = readSettings(file);
    if (locked.revision !== current.revision) {
      throw new Error("Settings changed; preview again and obtain fresh approval.");
    }
    temporaryDir = mkdtempSync(join(dirname(file), ".agent-loadout-"));
    const temporary = join(temporaryDir, "settings.json");
    const raw = `${JSON.stringify(next, null, 2)}\n`;
    writeFileSync(temporary, raw, { encoding: "utf8", mode: locked.mode, flag: "wx" });
    chmodSync(temporary, locked.mode);
    // Also detect edits by writers that do not participate in Pi's lock.
    if (readSettings(file).revision !== current.revision) {
      throw new Error("Settings changed during update; no replacement was made.");
    }
    renameSync(temporary, file);
    return { ...result, written: true, revision: revision(raw) };
  } finally {
    try {
      if (temporaryDir) rmSync(temporaryDir, { recursive: true, force: true });
    } finally {
      release();
    }
  }
}

function displayValue(value, field) {
  if (value === undefined) return "unset";
  if (value === false) return field === "model" ? "cleared" : "off";
  return JSON.stringify(value);
}

export function formatStatus(file, exists, settings) {
  const overrides = mappedOverrides(settings);
  const lines = [`Settings: ${file}${exists ? "" : " (missing)"}`, "Saved overrides only; not the live runtime mapping."];
  for (const [tier, agents] of Object.entries(TIER_AGENTS)) {
    const signatures = agents.map((agent) => JSON.stringify([
      overrides[agent]?.model ?? null, overrides[agent]?.thinking ?? null,
    ]));
    const mixed = new Set(signatures).size > 1;
    lines.push(`${tier}${mixed ? " (mixed overrides; may be intentional)" : ""}:`);
    for (const agent of agents) {
      const entry = overrides[agent] ?? {};
      lines.push(`  ${agent}: model=${displayValue(entry.model, "model")}, thinking=${displayValue(entry.thinking, "thinking")}`);
    }
  }
  return lines.join("\n");
}

export function formatChanges(before, after) {
  const previous = mappedOverrides(before);
  const next = mappedOverrides(after);
  const lines = [];
  for (const agent of AGENTS) {
    for (const field of ["model", "thinking"]) {
      const a = previous[agent]?.[field];
      const b = next[agent]?.[field];
      if (a !== b) lines.push(`  ${agent}.${field}: ${displayValue(a, field)} -> ${displayValue(b, field)}`);
    }
  }
  return lines.length ? lines.join("\n") : "No changes.";
}

function main() {
  const command = process.argv[2];
  const flags = {
    status: ["file"],
    set: ["file", "policies", "expect", "dry-run"],
    unset: ["file", "target", "expect", "dry-run"],
  };
  if (!Object.hasOwn(flags, command)) throw new Error("Expected command: set, unset, or status.");
  const { values } = parseArguments(process.argv.slice(2), flags[command], ["dry-run"]);
  if (!values.file) throw new Error("--file is required.");
  const file = resolve(values.file);
  if (command === "status") {
    const current = readSettings(file);
    console.log(formatStatus(file, current.exists, current.settings));
    console.log(`Revision: ${current.revision}`);
    return;
  }

  let policies;
  if (command === "set") {
    try {
      policies = JSON.parse(values.policies);
    } catch {
      throw new Error("--policies must be a JSON object of tier/role policies.");
    }
  }
  const result = updateSettings(file, (settings) => command === "set"
    ? setOverrides(settings, policies)
    : unsetOverrides(settings, values.target), {
    expectedRevision: values.expect,
    dryRun: values["dry-run"] === true,
  });
  console.log(`Settings: ${file}`);
  console.log(formatChanges(result.before, result.after));
  console.log(`Revision: ${result.revision}`);
  if (values["dry-run"]) console.log("Preview only. Confirm these changes before applying with --expect.");
  else if (result.written) console.log("Reload or restart Pi, then inspect /subagents-models before relying on this mapping.");
}

const isMain = process.argv[1]
  && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(`agent-loadout: ${error.message}`);
    process.exitCode = 1;
  }
}
