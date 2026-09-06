import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  describeMatches,
  findPiPackageRoot,
  parseArguments,
  rankModelMatches,
  searchModels,
  validateRequests,
} from "./model-options.mjs";

const models = [
  {
    provider: "provider-a",
    id: "fast-model",
    name: "Fast Model",
  },
  {
    provider: "provider-b",
    id: "fast-model",
    name: "Proxy Fast Model",
  },
  {
    provider: "provider-a",
    id: "deep-model",
    name: "Deep Reasoner",
  },
];

function fuzzyFilter(items, query, text) {
  const terms = query.toLowerCase().split(/\s+/);
  return items.filter((item) => {
    const candidate = text(item).toLowerCase();
    return terms.every((term) => candidate.includes(term));
  });
}

test("canonical model reference is an unambiguous exact match", () => {
  const matches = rankModelMatches(
    models,
    "provider-a/fast-model",
    fuzzyFilter,
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].model.provider, "provider-a");
  assert.equal(matches[0].exact, true);
});

test("duplicate bare model IDs are not marked exact", () => {
  const matches = rankModelMatches(models, "fast-model", fuzzyFilter);

  assert.equal(matches.length, 2);
  assert.equal(matches.some((match) => match.exact), false);
});

test("thinking choices and recommendation come from Pi callbacks", () => {
  const ranked = [{
    model: models[2],
    exact: true,
  }];

  const described = describeMatches(
    ranked,
    () => ["off", "high"],
    (_model, preferred) => preferred === "medium" ? "high" : "off",
    "medium",
  );

  assert.deepEqual(described[0].thinkingLevels, ["off", "high"]);
  assert.equal(described[0].preferredThinking, "high");
});

test("exact canonical and unique bare IDs win before fuzzy ranking or truncation", () => {
  const distractors = Array.from({ length: 12 }, (_, index) => ({
    provider: `p${index}`, id: "another", name: "deep-model",
  }));
  const catalog = [...distractors, models[2]];
  for (const query of ["deep-model", " provider-a/deep-model "]) {
    const ranked = rankModelMatches(catalog, query, () => distractors, 1);
    assert.deepEqual(ranked, [{ model: models[2], exact: true }]);
  }
  assert.throws(() => rankModelMatches(models, "  ", fuzzyFilter));
});

test("recognized provider qualifiers cannot fuzzy-match another provider", () => {
  const ranked = rankModelMatches(models, "provider-a/unknown", (items) => items);
  assert.ok(ranked.every(({ model }) => model.provider === "provider-a"));
});

test("batch results retain ambiguity counts and model-specific thinking metadata", () => {
  const helpers = {
    fuzzyFilter,
    getSupportedThinkingLevels: (model) => model.id === "deep-model" ? ["off", "high"] : ["off"],
    clampThinkingLevel: (model) => model.id === "deep-model" ? "high" : "off",
  };
  const results = searchModels(models, [
    { query: "fast-model", preferredThinking: "low" },
    { query: "deep-model", preferredThinking: "xhigh" },
    { query: "missing" },
  ], helpers, 1);
  assert.equal(results.length, 3);
  assert.equal(results[0].totalMatches, 2);
  assert.equal(results[0].truncated, true);
  assert.equal(results[0].matches.length, 1);
  assert.equal(results[0].matches[0].exact, false);
  assert.deepEqual(results[0].matches[0].thinkingLevels, ["off"]);
  assert.equal(results[0].matches[0].preferredThinking, "off");
  assert.equal(results[1].matches[0].exact, true);
  assert.equal(results[1].matches[0].preferredThinking, "high");
  assert.equal(results[1].truncated, false);
  assert.equal(results[2].totalMatches, 0);
  assert.deepEqual(results[2].matches, []);
  assert.throws(() => searchModels(models, [{ query: "fast" }], helpers, 0));
});

test("request and argument validation rejects typos, suffixes, duplicates, and missing values", () => {
  for (const input of [null, [], [{ query: "" }], [{ query: "p/model:high" }],
    [{ query: "model", preferredThinking: "invalid" }], [{ query: "model", typo: true }],
    Array.from({ length: 7 }, () => ({ query: "model" })),
  ]) assert.throws(() => validateRequests(input));
  assert.deepEqual(parseArguments(["set", "--file", "a", "--dry-run"], ["file", "dry-run"], ["dry-run"]), {
    command: "set", values: { file: "a", "dry-run": true },
  });
  for (const args of [["--file"], ["--typo", "x"], ["--file", "a", "--file", "b"],
    ["--file", "--other"], ["file", "a"],
  ]) assert.throws(() => parseArguments(["status", ...args], ["file"]));
});

test("package discovery handles nested bundled executables and rejects invalid explicit roots", {
  skip: process.platform === "win32" ? "Fixture uses a POSIX executable symlink" : false,
}, (t) => {
  const dir = mkdtempSync(join(tmpdir(), "loadout-package-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, "package");
  const bin = join(dir, "bin");
  const bundled = join(root, "dist", "bundle", "cli.js");
  mkdirSync(join(root, "dist", "bundle"), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent" }));
  writeFileSync(bundled, "#!/usr/bin/env node\n");
  chmodSync(bundled, 0o755);
  symlinkSync(bundled, join(bin, "pi"));
  const moduleUrl = new URL("./model-options.mjs", import.meta.url).href;
  const script = `import { findPiPackageRoot } from ${JSON.stringify(moduleUrl)}; console.log(findPiPackageRoot());`;
  const options = {
    cwd: dir, encoding: "utf8", timeout: 5_000,
    env: { PATH: `${bin}${delimiter}${process.env.PATH}`, HOME: dir, PI_PACKAGE_DIR: "" },
  };
  const found = spawnSync(process.execPath, ["--input-type=module", "-e", script], options);
  assert.equal(found.status, 0, found.stderr);
  assert.equal(found.stdout.trim(), root);
  const invalid = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    ...options, env: { ...options.env, PI_PACKAGE_DIR: join(dir, "missing") },
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /PI_PACKAGE_DIR must point/);
});

test("batch CLI uses installed Pi offline with isolated, credential-free fixture directories", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "loadout-model-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const helper = fileURLToPath(new URL("./model-options.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [helper, "batch", "--requests", JSON.stringify([
    { query: "gpt", preferredThinking: "low" },
    { query: "claude", preferredThinking: "high" },
  ])], {
    cwd: dir,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      PATH: process.env.PATH,
      HOME: dir,
      USERPROFILE: dir,
      PI_CODING_AGENT_DIR: join(dir, "agent"),
      PI_PACKAGE_DIR: findPiPackageRoot(),
      PI_OFFLINE: "1",
      PI_SKIP_VERSION_CHECK: "1",
    },
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const output = JSON.parse(result.stdout);
  assert.equal(output.launchVerified, false);
  assert.match(output.catalog, /session extension registrations are not loaded/);
  assert.equal(output.results.length, 2);
  for (const entry of output.results) {
    assert.ok(entry.matches.length > 0);
    for (const match of entry.matches) {
      assert.ok(match.thinkingLevels.includes(match.preferredThinking));
      assert.ok(match.model.includes("/"));
    }
  }
});
