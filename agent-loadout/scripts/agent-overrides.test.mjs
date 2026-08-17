import assert from "node:assert/strict";
import test from "node:test";

import {
  setOverrides,
  TIER_AGENTS,
  unsetOverrides,
} from "./agent-overrides.mjs";

const policies = {
  T1: { model: "provider/fast", thinking: "low" },
  T2: { model: "provider/review", thinking: "medium" },
  T3: { model: "provider/worker", thinking: "high" },
  T4: { model: "provider/deep", thinking: "xhigh" },
};

test("set applies tier policies and preserves unrelated settings", () => {
  const original = {
    packages: ["npm:pi-subagents"],
    subagents: {
      defaultModel: "provider/default",
      agentOverrides: {
        reviewer: {
          tools: "read,grep",
          model: "provider/old",
        },
        custom: {
          model: "provider/custom",
        },
      },
    },
  };

  const result = setOverrides(original, policies);

  for (const agent of TIER_AGENTS.T1) {
    assert.equal(result.subagents.agentOverrides[agent].model, "provider/fast");
    assert.equal(result.subagents.agentOverrides[agent].thinking, "low");
  }

  for (const agent of TIER_AGENTS.T2) {
    assert.equal(result.subagents.agentOverrides[agent].model, "provider/review");
    assert.equal(result.subagents.agentOverrides[agent].thinking, "medium");
  }

  assert.equal(result.subagents.agentOverrides.worker.model, "provider/worker");
  assert.equal(result.subagents.agentOverrides.worker.thinking, "high");
  assert.equal(result.subagents.agentOverrides.oracle.model, "provider/deep");
  assert.equal(result.subagents.agentOverrides.oracle.thinking, "xhigh");
  assert.equal(result.subagents.agentOverrides.reviewer.tools, "read,grep");
  assert.equal(result.subagents.agentOverrides.custom.model, "provider/custom");
  assert.deepEqual(result.packages, original.packages);
  assert.equal(original.subagents.agentOverrides.reviewer.model, "provider/old");
});

test("off is stored as false", () => {
  const result = setOverrides({}, {
    ...policies,
    T1: { model: "provider/fast", thinking: "off" },
  });

  assert.equal(result.subagents.agentOverrides.scout.thinking, false);
  assert.equal(result.subagents.agentOverrides.researcher.thinking, false);
});

test("unset removes only mapped model and thinking fields", () => {
  const result = unsetOverrides({
    subagents: {
      agentOverrides: {
        scout: {
          model: "provider/fast",
          thinking: "low",
        },
        reviewer: {
          model: "provider/review",
          thinking: "medium",
          tools: "read,grep",
        },
        custom: {
          model: "provider/custom",
          thinking: "high",
        },
      },
    },
  });

  assert.equal(result.subagents.agentOverrides.scout, undefined);
  assert.deepEqual(result.subagents.agentOverrides.reviewer, {
    tools: "read,grep",
  });
  assert.deepEqual(result.subagents.agentOverrides.custom, {
    model: "provider/custom",
    thinking: "high",
  });
});
