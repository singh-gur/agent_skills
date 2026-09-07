import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync,
  readdirSync, rmSync, statSync, symlinkSync, writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  formatChanges, formatStatus, parseCustomMap, readSettings, resolveTargets, resolveTargetList,
  setOverrides, TIER_AGENTS, unsetOverrides, updateSettings,
} from "./agent-overrides.mjs";
import { findPiPackageRoot } from "./model-options.mjs";

const policies = {
  T1: { model: "provider/fast", thinking: "low" },
  T2: { model: "provider/standard", thinking: "high" },
  T3: { model: "provider/deep", thinking: "xhigh" },
};
const configure = (settings) => setOverrides(settings, policies);
const helper = fileURLToPath(new URL("./agent-overrides.mjs", import.meta.url));

function fixture(t, settings) {
  const dir = mkdtempSync(join(tmpdir(), "agent-loadout-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "settings.json");
  if (settings !== undefined) writeFileSync(file, JSON.stringify(settings));
  return { dir, file };
}

function cli(...args) {
  return spawnSync(process.execPath, [helper, ...args], { encoding: "utf8" });
}

test("three-tier defaults preserve unrelated fields and do not mutate inputs", () => {
  assert.deepEqual(TIER_AGENTS, {
    T1: ["scout", "delegate"], T2: ["researcher", "worker"], T3: ["reviewer", "oracle"],
  });
  const original = {
    packages: ["npm:pi-subagents"],
    subagents: {
      defaultModel: "provider/default",
      agentOverridesByProvider: { other: { worker: { model: "other/model" } } },
      agentOverrides: {
        reviewer: { tools: "read,grep", disabled: true, model: "provider/old" },
        custom: { model: "provider/custom" },
      },
    },
  };
  const snapshot = structuredClone(original);
  const result = configure(original);
  for (const [tier, agents] of Object.entries(TIER_AGENTS)) {
    for (const agent of agents) {
      assert.equal(result.subagents.agentOverrides[agent].model, policies[tier].model);
      assert.equal(result.subagents.agentOverrides[agent].thinking, policies[tier].thinking);
    }
  }
  assert.deepEqual(original, snapshot);
  assert.equal(result.subagents.agentOverrides.reviewer.tools, "read,grep");
  assert.equal(result.subagents.agentOverrides.reviewer.disabled, true);
  assert.deepEqual(result.subagents.agentOverrides.custom, original.subagents.agentOverrides.custom);
  assert.deepEqual(result.subagents.agentOverridesByProvider, original.subagents.agentOverridesByProvider);
  assert.deepEqual(result.packages, original.packages);
  assert.equal(result.subagents.defaultModel, "provider/default");
});

test("partial tier/role edits, alias normalization, and targeted unset", () => {
  const original = configure({});
  const updated = setOverrides(original, {
    T1: { model: "provider/new-fast", thinking: "off" },
    advisor: { model: "provider/advice", thinking: "high" },
  });
  assert.equal(updated.subagents.agentOverrides.scout.thinking, false);
  assert.equal(updated.subagents.agentOverrides.delegate.thinking, false);
  assert.deepEqual(updated.subagents.agentOverrides.worker, original.subagents.agentOverrides.worker);
  assert.deepEqual(updated.subagents.agentOverrides.reviewer, original.subagents.agentOverrides.reviewer);
  assert.equal(updated.subagents.agentOverrides.oracle.model, "provider/advice");
  assert.equal(updated.subagents.agentOverrides.advisor, undefined);
  const withoutOracle = unsetOverrides(updated, "advisor");
  assert.equal(withoutOracle.subagents.agentOverrides.oracle, undefined);
  assert.deepEqual(withoutOracle.subagents.agentOverrides.reviewer, original.subagents.agentOverrides.reviewer);
  const withoutT1 = unsetOverrides(updated, "T1");
  assert.equal(withoutT1.subagents.agentOverrides.scout, undefined);
  assert.equal(withoutT1.subagents.agentOverrides.delegate, undefined);
  assert.equal(updated.subagents.agentOverrides.oracle.model, "provider/advice");
  assert.equal(resolveTargets("all").length, 6);
});

test("unset removes only selected model/thinking and empty override containers", () => {
  const original = {
    subagents: { agentOverrides: {
      scout: policies.T1,
      reviewer: { ...policies.T3, tools: "read,grep" },
      custom: policies.T2,
    } },
  };
  const result = unsetOverrides(original);
  assert.equal(result.subagents.agentOverrides.scout, undefined);
  assert.deepEqual(result.subagents.agentOverrides.reviewer, { tools: "read,grep" });
  assert.deepEqual(result.subagents.agentOverrides.custom, policies.T2);
  assert.deepEqual(unsetOverrides(configure({})), { subagents: {} });
  assert.equal(original.subagents.agentOverrides.scout.model, policies.T1.model);
  for (const empty of [
    { subagents: { agentOverrides: {} } },
    { subagents: { agentOverrides: { scout: {}, worker: { tools: "read" } } } },
  ]) assert.deepEqual(unsetOverrides(empty), empty);
});

test("all operations reject malformed mapped settings rather than reporting unset", () => {
  for (const settings of [null, [], { subagents: [] },
    { subagents: { agentOverrides: [] } },
    { subagents: { agentOverrides: { worker: 42 } } },
    { subagents: { agentOverrides: { worker: { model: 42 } } } },
    { subagents: { agentOverrides: { worker: { thinking: "invalid" } } } },
  ]) {
    assert.throws(() => configure(settings));
    assert.throws(() => unsetOverrides(settings));
    assert.throws(() => formatStatus("fixture.json", true, settings));
  }
  for (const bad of [null, {}, { T4: policies.T3 }, { typo: policies.T1 },
    { T3: policies.T3, reviewer: policies.T3 },
    { oracle: policies.T3, advisor: policies.T3 },
    { worker: { model: "bare-model", thinking: "high" } },
    { worker: { model: "p/model:high", thinking: "low" } },
    { worker: { model: "p/model", thinking: "invalid" } },
    { worker: { ...policies.T2, tools: "write" } },
  ]) assert.throws(() => setOverrides({}, bad));
  assert.throws(() => unsetOverrides({}, "T4"));
});

test("saved status distinguishes missing, mixed, cleared, and unset without leaking other fields", () => {
  const settings = { unrelated: "PRIVATE_FIXTURE", subagents: { agentOverrides: {
    scout: { model: false, thinking: false, systemPrompt: "PRIVATE_FIXTURE" },
    custom: { model: "PRIVATE_FIXTURE" },
  } } };
  const text = formatStatus("fixture.json", true, settings);
  assert.match(text, /T1 \(mixed overrides/);
  assert.match(text, /scout: model=cleared, thinking=off/);
  assert.match(text, /delegate: model=unset, thinking=unset/);
  assert.doesNotMatch(text, /PRIVATE_FIXTURE/);
  assert.match(formatStatus("fixture.json", false, {}), /\(missing\)/);
  assert.equal(formatChanges(settings, settings), "No changes.");
  assert.doesNotMatch(formatChanges(settings, configure(settings)), /PRIVATE_FIXTURE/);
});

test("preview/missing unset create nothing; writes require the approved revision", (t) => {
  const { dir } = fixture(t);
  const file = join(dir, "new", ".pi", "settings.json");
  const preview = updateSettings(file, configure, { dryRun: true });
  assert.equal(preview.revision, "missing");
  assert.equal(preview.changed, true);
  assert.equal(preview.written, false);
  assert.equal(existsSync(join(dir, "new")), false);
  assert.throws(() => updateSettings(file, configure), /--expect/);
  const noop = updateSettings(file, unsetOverrides, { expectedRevision: "missing" });
  assert.equal(noop.changed, false);
  assert.equal(existsSync(join(dir, "new")), false);
  const result = updateSettings(file, configure, { expectedRevision: preview.revision });
  assert.equal(result.written, true);
  assert.deepEqual(readSettings(file).settings, configure({}));
  if (process.platform !== "win32") assert.equal(statSync(file).mode & 0o777, 0o600);
});

test("no-op preserves bytes/mtime; replacement preserves permissions and unrelated fields", (t) => {
  const { dir, file } = fixture(t, configure({ untouched: "fixture" }));
  if (process.platform !== "win32") chmodSync(file, 0o640);
  const raw = readFileSync(file, "utf8");
  const stat = statSync(file);
  const current = readSettings(file);
  assert.equal(updateSettings(file, configure, { expectedRevision: current.revision }).written, false);
  assert.equal(readFileSync(file, "utf8"), raw);
  assert.equal(statSync(file).mtimeMs, stat.mtimeMs);
  const changed = updateSettings(file, (settings) => unsetOverrides(settings, "worker"), {
    expectedRevision: current.revision,
  });
  assert.equal(changed.written, true);
  assert.equal(readSettings(file).settings.untouched, "fixture");
  if (process.platform !== "win32") assert.equal(statSync(file).mode & 0o777, 0o640);
  assert.deepEqual(readdirSync(dir), ["settings.json"]);
});

test("stale approval and changes between read and lock never overwrite newer settings", (t) => {
  const { dir, file } = fixture(t, {});
  const preview = updateSettings(file, configure, { dryRun: true });
  writeFileSync(file, '{"newer":"fixture"}');
  assert.throws(() => updateSettings(file, configure, { expectedRevision: preview.revision }), /Settings changed/);
  const current = readSettings(file);
  assert.throws(() => updateSettings(file, (settings) => {
    writeFileSync(file, '{"newest":"fixture"}');
    return configure(settings);
  }, { expectedRevision: current.revision }), /Settings changed/);
  assert.deepEqual(readSettings(file).settings, { newest: "fixture" });
  assert.deepEqual(readdirSync(dir), ["settings.json"]);
});

test("respects Pi's settings lock and leaves the owner's lock intact", (t) => {
  const { file } = fixture(t, {});
  const require = createRequire(join(findPiPackageRoot(), "package.json"));
  const lockfile = require("proper-lockfile");
  const release = lockfile.lockSync(file, { realpath: false });
  try {
    assert.throws(() => updateSettings(file, configure, {
      expectedRevision: readSettings(file).revision,
    }), (error) => error.code === "ELOCKED");
    assert.equal(existsSync(`${file}.lock`), true);
    assert.equal(readFileSync(file, "utf8"), "{}");
  } finally {
    release();
  }
});

test("rejects regular and dangling settings symlinks without replacing them", {
  skip: process.platform === "win32" ? "Symlink creation requires Windows privileges" : false,
}, (t) => {
  const { dir, file } = fixture(t, {});
  for (const target of [file, join(dir, "missing.json")]) {
    const link = join(dir, target === file ? "link.json" : "dangling.json");
    symlinkSync(target, link);
    assert.throws(() => readSettings(link), /symlinks/);
    assert.throws(() => updateSettings(link, configure, { expectedRevision: "missing" }), /symlinks/);
    assert.throws(() => updateSettings(link, unsetOverrides, { dryRun: true }), /symlinks/);
    assert.equal(lstatSync(link).isSymbolicLink(), true);
  }
  assert.equal(readFileSync(file, "utf8"), "{}");
});

test("custom agents join tiers for the invocation and surface as unmapped otherwise", () => {
  const custom = parseCustomMap({ "workbench-plan-auditor": "T2", "workbench-brief-analyst": "T1" });
  assert.deepEqual(resolveTargets("all", custom), [
    "scout", "delegate", "workbench-brief-analyst",
    "researcher", "worker", "workbench-plan-auditor",
    "reviewer", "oracle",
  ]);
  assert.deepEqual(resolveTargets("T1", custom), ["scout", "delegate", "workbench-brief-analyst"]);
  assert.deepEqual(resolveTargets("workbench-plan-auditor", custom), ["workbench-plan-auditor"]);
  assert.equal(resolveTargets("all").length, 6);
  assert.throws(() => parseCustomMap({ reviewer: "T3" }), /non-builtin/);
  assert.throws(() => parseCustomMap({ advisor: "T3" }), /non-builtin/);
  assert.throws(() => parseCustomMap({ custom: "T4" }), /T1, T2, T3, or null/);

  const addressable = parseCustomMap({ "workbench-plan-auditor": null });
  assert.deepEqual(resolveTargets("all", addressable), resolveTargets("all"));
  assert.deepEqual(resolveTargets("workbench-plan-auditor", addressable), ["workbench-plan-auditor"]);
  assert.throws(() => resolveTargets("workbench-plan-auditor", {}), /Expected target/);
  assert.deepEqual(resolveTargetList(["T2", "reviewer", "worker", "T3"], addressable), [
    "researcher", "worker", "reviewer", "oracle",
  ]);

  const original = { subagents: { agentOverrides: { left: { model: "p/m", thinking: "low" } } } };
  const updated = setOverrides(original, { T2: policies.T2 }, custom);
  assert.equal(updated.subagents.agentOverrides["workbench-plan-auditor"].model, policies.T2.model);
  assert.deepEqual(updated.subagents.agentOverrides.left, original.subagents.agentOverrides.left);
  const without = unsetOverrides(updated, "all", custom);
  assert.deepEqual(without.subagents.agentOverrides["workbench-plan-auditor"], undefined);
  assert.deepEqual(without.subagents.agentOverrides.left, original.subagents.agentOverrides.left);
  assert.deepEqual(updated.subagents.agentOverrides.left, original.subagents.agentOverrides.left);

  const checklist = unsetOverrides(updated, ["T1", "workbench-plan-auditor"], addressable);
  assert.equal(checklist.subagents.agentOverrides["workbench-plan-auditor"], undefined);
  assert.equal(checklist.subagents.agentOverrides.scout, undefined);
  assert.deepEqual(checklist.subagents.agentOverrides.researcher, updated.subagents.agentOverrides.researcher);

  const status = formatStatus("s.json", true, updated, custom);
  assert.match(status, /T2:\n  researcher: model="provider\/standard", thinking="high"\n  worker: model="provider\/standard", thinking="high"\n  workbench-plan-auditor: model="provider\/standard"/);
  const unmappedStatus = formatStatus("s.json", true, original);
  assert.match(unmappedStatus, /Unmapped overrides \(pass --custom to manage with tiers\): left/);
  assert.match(formatChanges(original, updated, custom), /workbench-plan-auditor\.model: unset -> "provider\/standard"/);
});

test("CLI previews/applies targeted policies, rejects legacy flags, and sanitizes parse errors", (t) => {
  const { file } = fixture(t, {});
  const args = ["set", "--file", file, "--policies", JSON.stringify({ reviewer: policies.T3 })];
  const preview = cli(...args, "--dry-run");
  assert.equal(preview.status, 0, preview.stderr);
  const revision = preview.stdout.match(/Revision: (\w+)/)[1];
  assert.equal(readFileSync(file, "utf8"), "{}");
  assert.equal(cli(...args, "--expect", revision).status, 0);
  assert.deepEqual(Object.keys(readSettings(file).settings.subagents.agentOverrides), ["reviewer"]);
  assert.equal(cli(...args, "--t4-model", "p/model", "--dry-run").status, 1);
  const listArgs = ["set", "--file", file, "--policies", JSON.stringify({ T2: policies.T2 }),
    "--custom", JSON.stringify({ "workbench-plan-auditor": "T2" })];
  const listPreview = cli(...listArgs, "--dry-run");
  assert.equal(listPreview.status, 0, listPreview.stderr);
  const listRevision = listPreview.stdout.match(/Revision: (\w+)/)[1];
  assert.equal(cli(...listArgs, "--expect", listRevision).status, 0);
  const unsetPreview = cli("unset", "--file", file, "--target", "reviewer, workbench-plan-auditor",
    "--custom", JSON.stringify({ "workbench-plan-auditor": null }), "--dry-run");
  assert.equal(unsetPreview.status, 0, unsetPreview.stderr);
  assert.match(unsetPreview.stdout, /workbench-plan-auditor\.model: "provider\/standard" -> unset/);
  assert.doesNotMatch(unsetPreview.stdout, /worker\.model/);
  assert.equal(cli("unset", "--file", file, "--target", "workbench-plan-auditor", "--dry-run").status, 1);
  assert.equal(cli("unset", "--file", file, "--target", " ", "--dry-run").status, 1);
  const customArgs = ["set", "--file", file, "--policies", JSON.stringify({ T3: policies.T3 }),
    "--custom", JSON.stringify({ "workbench-plan-auditor": "T3" })];
  const customPreview = cli(...customArgs, "--dry-run");
  assert.equal(customPreview.status, 0, customPreview.stderr);
  assert.match(customPreview.stdout, /workbench-plan-auditor\.model/);
  assert.equal(cli("set", "--file", file, "--policies", "{}", "--custom", JSON.stringify({ x: "T9" }), "--dry-run").status, 1);
  assert.equal(cli("set", "--file", file, "--policies", "{}", "--custom", "not-json", "--dry-run").status, 1);
  assert.equal(cli("unset", "--file", file).status, 1);
  assert.equal(cli("status", "--file", file, "--file", file).status, 1);
  writeFileSync(file, '{"unrelated":"PRIVATE_FIXTURE",');
  const invalid = cli("status", "--file", file);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Invalid settings JSON/);
  assert.doesNotMatch(invalid.stdout + invalid.stderr, /PRIVATE_FIXTURE/);
});
