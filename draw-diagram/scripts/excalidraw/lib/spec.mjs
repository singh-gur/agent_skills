/** Spec loading and validation: fail loudly on the mistakes that ruin layouts. */

import fs from "node:fs/promises";
import path from "node:path";
import { EDGE_KIND_NAMES, GROUP_KIND_NAMES, ROLE_NAMES } from "./theme.mjs";

function fail(message) {
  throw new Error(`Invalid diagram spec: ${message}`);
}

function isInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export async function loadSpec(specPath) {
  const raw = await fs.readFile(specPath, "utf8");
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (error) {
    fail(`${specPath} is not valid JSON (${error.message})`);
  }
  return validateSpec(spec, path.dirname(path.resolve(specPath)));
}

export function validateSpec(spec, baseDir = process.cwd()) {
  if (!spec || typeof spec !== "object") fail("expected an object");
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) fail("`nodes` must be a non-empty array");

  const ids = new Set();
  const cells = new Map();
  for (const node of spec.nodes) {
    if (!node.id) fail("every node needs an `id`");
    if (ids.has(node.id)) fail(`duplicate node id: ${node.id}`);
    ids.add(node.id);
    if (!node.label) fail(`node ${node.id} needs a \`label\``);
    if (!isInteger(node.col) || !isInteger(node.row)) fail(`node ${node.id} needs integer \`col\` and \`row\``);
    if (node.kind && !ROLE_NAMES.includes(node.kind)) {
      fail(`node ${node.id} has unknown kind "${node.kind}" (expected one of: ${ROLE_NAMES.join(", ")})`);
    }
    for (let col = node.col; col < node.col + (node.colSpan ?? 1); col += 1) {
      for (let row = node.row; row < node.row + (node.rowSpan ?? 1); row += 1) {
        const cell = `${col},${row}`;
        if (cells.has(cell)) fail(`nodes ${cells.get(cell)} and ${node.id} both occupy cell ${cell}`);
        cells.set(cell, node.id);
      }
    }
  }

  const colCount = Math.max(...spec.nodes.map((node) => node.col + (node.colSpan ?? 1)));
  const rowCount = Math.max(...spec.nodes.map((node) => node.row + (node.rowSpan ?? 1)));

  for (const group of spec.groups ?? []) {
    if (!group.id) fail("every group needs an `id`");
    if (!Array.isArray(group.cols) || !Array.isArray(group.rows)) {
      fail(`group ${group.id} needs \`cols: [first, last]\` and \`rows: [first, last]\``);
    }
    if (group.cols[1] < group.cols[0] || group.rows[1] < group.rows[0]) {
      fail(`group ${group.id} has an inverted cell range`);
    }
    if (group.cols[1] >= colCount || group.rows[1] >= rowCount || group.cols[0] < 0 || group.rows[0] < 0) {
      fail(
        `group ${group.id} covers cells outside the grid (columns 0..${colCount - 1}, rows 0..${rowCount - 1})`,
      );
    }
    if (group.kind && !GROUP_KIND_NAMES.includes(group.kind)) {
      fail(`group ${group.id} has unknown kind "${group.kind}" (expected one of: ${GROUP_KIND_NAMES.join(", ")})`);
    }
  }

  for (const edge of spec.edges ?? []) {
    if (!ids.has(edge.from)) fail(`edge references unknown node "${edge.from}"`);
    if (!ids.has(edge.to)) fail(`edge references unknown node "${edge.to}"`);
    if (edge.from === edge.to) fail(`self-edges are not supported (${edge.from})`);
    if (edge.kind && !EDGE_KIND_NAMES.includes(edge.kind)) {
      fail(`edge ${edge.from} -> ${edge.to} has unknown kind "${edge.kind}" (expected one of: ${EDGE_KIND_NAMES.join(", ")})`);
    }
  }

  for (const item of spec.legend ?? []) {
    if (!item.label) fail("every legend item needs a `label`");
    if (!item.kind && !item.edgeKind) fail(`legend item "${item.label}" needs a \`kind\` or \`edgeKind\``);
    if (item.kind && !ROLE_NAMES.includes(item.kind)) fail(`legend item "${item.label}" has unknown kind "${item.kind}"`);
    if (item.edgeKind && !EDGE_KIND_NAMES.includes(item.edgeKind)) {
      fail(`legend item "${item.label}" has unknown edgeKind "${item.edgeKind}"`);
    }
  }

  return { ...spec, baseDir };
}

export async function loadIcons(spec) {
  const files = {};
  const byNode = new Map();
  const iconsDir = spec.iconsDir ? path.resolve(spec.baseDir, spec.iconsDir) : spec.baseDir;

  for (const node of spec.nodes) {
    if (!node.icon) continue;
    const iconPath = path.isAbsolute(node.icon)
      ? node.icon
      : path.resolve(node.icon.includes("/") ? spec.baseDir : iconsDir, node.icon);
    let svg;
    try {
      svg = await fs.readFile(iconPath, "utf8");
    } catch {
      throw new Error(`Icon for node ${node.id} not found: ${iconPath}`);
    }
    if (/<script|on\w+\s*=|foreignObject|xlink:href\s*=\s*["']https?:/i.test(svg)) {
      throw new Error(`Icon ${iconPath} contains active or remote content; vendor a clean SVG instead`);
    }
    const fileId = `icon-${path.basename(iconPath).replace(/[^a-z0-9]+/gi, "-")}`;
    files[fileId] = {
      mimeType: "image/svg+xml",
      id: fileId,
      dataURL: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
      created: 1,
      lastRetrieved: 1,
    };
    byNode.set(node.id, fileId);
  }
  return { files, byNode };
}
