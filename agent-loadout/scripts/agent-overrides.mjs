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
const BUILTIN_AGENTS = Object.values(TIER_AGENTS).flat();

// Custom agents join a tier for the current invocation only; the assignment is
// not persisted to settings. A null tier makes the agent addressable (direct
// target, comma lists, unset) without joining any tier — for unset checklists.
export function parseCustomMap(custom) {
  if (custom === undefined) return {};
  requireObject(custom, "Custom agent map");
  const map = {};
  for (const [name, tier] of Object.entries(custom)) {
    const agent = String(name).trim();
    if (!agent || BUILTIN_AGENTS.includes(agent) || agent === "advisor") {
      throw new Error(`Custom agents must be non-builtin names distinct from advisor: ${JSON.stringify(name)}.`);
    }
    if (tier !== null && !Object.hasOwn(TIER_AGENTS, tier)) {
      throw new Error(`Custom tier for ${agent} must be one of: T1, T2, T3, or null.`);
    }
    map[agent] = tier;
  }
  return map;
}

function tierAgents(custom = {}) {
  const tiers = Object.fromEntries(
    Object.entries(TIER_AGENTS).map(([tier, agents]) => [tier, [...agents]]),
  );
  for (const [agent, tier] of Object.entries(custom)) {
    if (tier) tiers[tier].push(agent);
  }
  return tiers;
}

// Every agent the invocation knows: tier-assigned plus null-tier addressable.
function managedAgents(custom = {}) {
  return [...new Set([...Object.values(tierAgents(custom)).flat(), ...Object.keys(custom)])];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isObject(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}

export function resolveTargets(target = "all", custom = {}) {
  if (target === "advisor") target = "oracle";
  const tiers = tierAgents(custom);
  if (target === "all") return Object.values(tiers).flat();
  if (Object.hasOwn(tiers, target)) return [...tiers[target]];
  if (Object.hasOwn(custom, target)) return [target];
  if (BUILTIN_AGENTS.includes(target)) return [target];
  const known = managedAgents(custom);
  throw new Error(`Expected target: all, T1, T2, T3, or one of ${known.join(", ")}.`);
}

export function mappedOverrides(settings) {
  requireObject(settings, "Settings root");
  if (settings.subagents === undefined) return {};
  const subagents = requireObject(settings.subagents, "subagents");
  if (subagents.agentOverrides === undefined) return {};
  const overrides = requireObject(subagents.agentOverrides, "subagents.agentOverrides");

  for (const agent of BUILTIN_AGENTS) {
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

export function setOverrides(settings, policies, custom = {}) {
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
    for (const agent of resolveTargets(target, custom)) {
      if (selected.has(agent)) throw new Error(`Overlapping policies for ${agent}.`);
      selected.add(agent);
      overrides[agent] = { ...overrides[agent], ...normalized };
    }
  }
  return next;
}

export function resolveTargetList(targets, custom = {}) {
  return [...new Set(targets.flatMap((target) => resolveTargets(target, custom)))];
}

export function unsetOverrides(settings, target = "all", custom = {}) {
  mappedOverrides(settings);
  const agents = Array.isArray(target)
    ? resolveTargetList(target, custom)
    : resolveTargets(target, custom);
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

export function formatStatus(file, exists, settings, custom = {}) {
  const overrides = mappedOverrides(settings);
  const tiers = tierAgents(custom);
  const lines = [`Settings: ${file}${exists ? "" : " (missing)"}`, "Saved overrides only; not the live runtime mapping."];
  for (const [tier, agents] of Object.entries(tiers)) {
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
  const mapped = new Set(managedAgents(custom));
  const unmapped = Object.keys(overrides).filter((agent) => !mapped.has(agent)).sort();
  if (unmapped.length) {
    // Names only: unmapped entries are unvalidated, so their values are withheld.
    lines.push(`Unmapped overrides (pass --custom to manage with tiers): ${unmapped.join(", ")}`);
  }
  return lines.join("\n");
}

export function formatChanges(before, after, custom = {}) {
  const previous = mappedOverrides(before);
  const next = mappedOverrides(after);
  const lines = [];
  for (const agent of managedAgents(custom)) {
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
    status: ["file", "custom"],
    set: ["file", "policies", "expect", "dry-run", "custom"],
    unset: ["file", "target", "expect", "dry-run", "custom"],
  };
  if (!Object.hasOwn(flags, command)) throw new Error("Expected command: set, unset, or status.");
  const { values } = parseArguments(process.argv.slice(2), flags[command], ["dry-run"]);
  if (!values.file) throw new Error("--file is required.");
  const file = resolve(values.file);
  let custom;
  if (values.custom !== undefined) {
    try {
      custom = JSON.parse(values.custom);
    } catch {
      throw new Error("--custom must be a JSON object mapping agent names to tiers.");
    }
  }
  const customMap = parseCustomMap(custom);
  const targets = values.target === undefined
    ? undefined
    : values.target.split(",").map((name) => name.trim()).filter(Boolean);
  if (values.target !== undefined && !targets.length) {
    throw new Error("--target needs at least one of: all, T1, T2, T3, or a role name.");
  }
  if (command === "status") {
    const current = readSettings(file);
    console.log(formatStatus(file, current.exists, current.settings, customMap));
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
    ? setOverrides(settings, policies, customMap)
    : unsetOverrides(settings, targets ?? "all", customMap), {
    expectedRevision: values.expect,
    dryRun: values["dry-run"] === true,
  });
  console.log(`Settings: ${file}`);
  console.log(formatChanges(result.before, result.after, customMap));
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
