#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TIER_AGENTS = {
  T1: ["scout", "researcher"],
  T2: ["reviewer", "delegate"],
  T3: ["worker"],
  T4: ["oracle"],
};

const THINKING_LEVELS = new Set([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function objectField(parent, key, label) {
  if (parent[key] === undefined) parent[key] = {};
  if (!isObject(parent[key])) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parent[key];
}

function normalizePolicy(policy, tier) {
  if (!isObject(policy) || typeof policy.model !== "string" || !policy.model.trim()) {
    throw new Error(`${tier} model must be a non-empty string.`);
  }

  if (!THINKING_LEVELS.has(policy.thinking)) {
    throw new Error(
      `${tier} thinking must be one of: ${[...THINKING_LEVELS].join(", ")}.`,
    );
  }

  return {
    model: policy.model.trim(),
    thinking: policy.thinking === "off" ? false : policy.thinking,
  };
}

export function setOverrides(settings, policies) {
  if (!isObject(settings)) throw new Error("Settings root must be a JSON object.");

  const next = copy(settings);
  const subagents = objectField(next, "subagents", "subagents");
  const overrides = objectField(
    subagents,
    "agentOverrides",
    "subagents.agentOverrides",
  );

  for (const [tier, agents] of Object.entries(TIER_AGENTS)) {
    const policy = normalizePolicy(policies[tier], tier);

    for (const agent of agents) {
      const current = overrides[agent];
      if (current !== undefined && !isObject(current)) {
        throw new Error(
          `subagents.agentOverrides.${agent} must be a JSON object.`,
        );
      }

      overrides[agent] = {
        ...(current ?? {}),
        model: policy.model,
        thinking: policy.thinking,
      };
    }
  }

  return next;
}

export function unsetOverrides(settings) {
  if (!isObject(settings)) throw new Error("Settings root must be a JSON object.");

  const next = copy(settings);
  const subagents = next.subagents;

  if (subagents === undefined) return next;
  if (!isObject(subagents)) throw new Error("subagents must be a JSON object.");

  const overrides = subagents.agentOverrides;
  if (overrides === undefined) return next;
  if (!isObject(overrides)) {
    throw new Error("subagents.agentOverrides must be a JSON object.");
  }

  for (const agents of Object.values(TIER_AGENTS)) {
    for (const agent of agents) {
      const current = overrides[agent];
      if (current === undefined) continue;
      if (!isObject(current)) {
        throw new Error(
          `subagents.agentOverrides.${agent} must be a JSON object.`,
        );
      }

      delete current.model;
      delete current.thinking;

      if (Object.keys(current).length === 0) delete overrides[agent];
    }
  }

  if (Object.keys(overrides).length === 0) delete subagents.agentOverrides;

  return next;
}

function readSettings(file) {
  if (!existsSync(file)) return { exists: false, settings: {} };

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${file}: ${error.message}`);
  }

  if (!isObject(parsed)) {
    throw new Error(`Settings root in ${file} must be a JSON object.`);
  }

  return { exists: true, settings: parsed };
}

function writeSettings(file, settings) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  const mode = existsSync(file) ? statSync(file).mode & 0o777 : 0o600;
  const temporary = `${file}.${process.pid}.tmp`;

  try {
    writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: "utf8",
      mode,
    });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function displayValue(value) {
  if (value === undefined) return "unset";
  if (value === false) return "off";
  return String(value);
}

export function formatStatus(file, exists, settings) {
  const overrides = isObject(settings.subagents)
    && isObject(settings.subagents.agentOverrides)
    ? settings.subagents.agentOverrides
    : {};

  const lines = [`Settings: ${file}${exists ? "" : " (missing)"}`];

  for (const [tier, agents] of Object.entries(TIER_AGENTS)) {
    lines.push(`${tier}:`);

    for (const agent of agents) {
      const override = isObject(overrides[agent]) ? overrides[agent] : {};
      lines.push(
        `  ${agent}: model=${displayValue(override.model)}, thinking=${displayValue(override.thinking)}`,
      );
    }
  }

  return lines.join("\n");
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

function policiesFrom(values) {
  return {
    T1: { model: values["t1-model"], thinking: values["t1-thinking"] },
    T2: { model: values["t2-model"], thinking: values["t2-thinking"] },
    T3: { model: values["t3-model"], thinking: values["t3-thinking"] },
    T4: { model: values["t4-model"], thinking: values["t4-thinking"] },
  };
}

function main() {
  const { command, values } = parseArguments(process.argv.slice(2));

  if (!["set", "unset", "status"].includes(command)) {
    throw new Error("Expected command: set, unset, or status.");
  }

  if (!values.file) throw new Error("--file is required.");

  const file = resolve(values.file);
  const current = readSettings(file);

  if (command === "status") {
    console.log(formatStatus(file, current.exists, current.settings));
    return;
  }

  if (command === "unset" && !current.exists) {
    console.log(formatStatus(file, false, current.settings));
    console.log("Nothing to unset.");
    return;
  }

  const next = command === "set"
    ? setOverrides(current.settings, policiesFrom(values))
    : unsetOverrides(current.settings);

  writeSettings(file, next);
  console.log(formatStatus(file, true, next));
  console.log("Reload or restart Pi to apply the updated agent mapping.");
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
