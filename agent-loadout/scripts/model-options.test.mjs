import assert from "node:assert/strict";
import test from "node:test";

import {
  describeMatches,
  rankModelMatches,
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
