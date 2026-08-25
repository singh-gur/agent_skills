/** Spec loading and validation: fail loudly on the mistakes that ruin layouts. */

import fs from "node:fs/promises";
import path from "node:path";
import { EDGE_KIND_NAMES, GROUP_KIND_NAMES, ROLE_NAMES } from "./theme.mjs";

/**
 * Budget for a spec the builder did not write itself. Every ceiling sits far
 * above any diagram a reader could follow, so hitting one means the spec is
 * broken rather than ambitious. Counts and spans are checked before any loop
 * walks them, because the cell map below is itself caller-sized work.
 */
export const LIMITS = {
  specBytes: 2 * 1024 * 1024,
  iconBytes: 256 * 1024,
  nodes: 500,
  edges: 1000,
  groups: 50,
  legend: 50,
  coord: 200,
  span: 50,
  cells: 10_000,
  label: 200,
  title: 300,
};

function fail(message) {
  throw new Error(`Invalid diagram spec: ${message}`);
}

function isInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function checkCount(value, limit, what) {
  if (Array.isArray(value) && value.length > limit) {
    fail(`too many ${what}: ${value.length} (limit ${limit})`);
  }
}

function checkText(value, limit, what) {
  if (typeof value === "string" && value.length > limit) {
    fail(`${what} is longer than ${limit} characters`);
  }
}

function checkNumbers(values, min, max, what) {
  if (values === undefined || values === null) return;
  if (typeof values !== "object") fail(`\`${what}\` must be an object`);
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      fail(`\`${what}.${key}\` must be a finite number between ${min} and ${max}`);
    }
  }
}

export async function loadSpec(specPath) {
  const stat = await fs.stat(specPath);
  if (stat.size > LIMITS.specBytes) {
    fail(`${specPath} is larger than the ${LIMITS.specBytes} byte limit`);
  }
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

  checkCount(spec.nodes, LIMITS.nodes, "nodes");
  checkCount(spec.edges, LIMITS.edges, "edges");
  checkCount(spec.groups, LIMITS.groups, "groups");
  checkCount(spec.legend, LIMITS.legend, "legend items");
  checkText(spec.title, LIMITS.title, "`title`");
  checkText(spec.subtitle, LIMITS.title, "`subtitle`");
  checkNumbers(spec.layout, 0, 4000, "layout");
  checkNumbers(spec.font, 1, 512, "font");

  const ids = new Set();
  const cells = new Map();
  for (const node of spec.nodes) {
    if (!node.id) fail("every node needs an `id`");
    if (ids.has(node.id)) fail(`duplicate node id: ${node.id}`);
    ids.add(node.id);
    if (!node.label) fail(`node ${node.id} needs a \`label\``);
    checkText(node.label, LIMITS.label, `node ${node.id} \`label\``);
    checkText(node.sublabel, LIMITS.label, `node ${node.id} \`sublabel\``);
    if (!isInteger(node.col) || !isInteger(node.row)) fail(`node ${node.id} needs integer \`col\` and \`row\``);
    if (node.col > LIMITS.coord || node.row > LIMITS.coord) {
      fail(`node ${node.id} sits outside the ${LIMITS.coord}x${LIMITS.coord} grid`);
    }
    const colSpan = node.colSpan ?? 1;
    const rowSpan = node.rowSpan ?? 1;
    if (!isInteger(colSpan) || !isInteger(rowSpan) || colSpan < 1 || rowSpan < 1) {
      fail(`node ${node.id} needs positive integer \`colSpan\` and \`rowSpan\``);
    }
    if (colSpan > LIMITS.span || rowSpan > LIMITS.span) {
      fail(`node ${node.id} spans more than ${LIMITS.span} cells`);
    }
    if (node.width !== undefined && (!Number.isFinite(node.width) || node.width <= 0 || node.width > 4000)) {
      fail(`node ${node.id} needs a \`width\` between 1 and 4000`);
    }
    if (node.kind && !ROLE_NAMES.includes(node.kind)) {
      fail(`node ${node.id} has unknown kind "${node.kind}" (expected one of: ${ROLE_NAMES.join(", ")})`);
    }
    for (let col = node.col; col < node.col + colSpan; col += 1) {
      for (let row = node.row; row < node.row + rowSpan; row += 1) {
        const cell = `${col},${row}`;
        if (cells.has(cell)) fail(`nodes ${cells.get(cell)} and ${node.id} both occupy cell ${cell}`);
        cells.set(cell, node.id);
      }
    }
  }

  // `Math.max(...)` spreads the whole array onto the stack; reduce keeps a large
  // spec on the clean `fail()` path instead of a RangeError.
  const colCount = spec.nodes.reduce((max, node) => Math.max(max, node.col + (node.colSpan ?? 1)), 0);
  const rowCount = spec.nodes.reduce((max, node) => Math.max(max, node.row + (node.rowSpan ?? 1)), 0);
  if (colCount * rowCount > LIMITS.cells) {
    fail(`grid is ${colCount}x${rowCount} cells, above the ${LIMITS.cells} cell limit`);
  }

  for (const group of spec.groups ?? []) {
    if (!group.id) fail("every group needs an `id`");
    if (!Array.isArray(group.cols) || !Array.isArray(group.rows)) {
      fail(`group ${group.id} needs \`cols: [first, last]\` and \`rows: [first, last]\``);
    }
    if (
      group.cols.length !== 2 ||
      group.rows.length !== 2 ||
      !group.cols.every(isInteger) ||
      !group.rows.every(isInteger)
    ) {
      fail(`group ${group.id} needs \`cols\` and \`rows\` as two non-negative integers each`);
    }
    checkText(group.title, LIMITS.label, `group ${group.id} \`title\``);
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
    checkText(edge.label, LIMITS.label, `edge ${edge.from} -> ${edge.to} \`label\``);
    if (edge.kind && !EDGE_KIND_NAMES.includes(edge.kind)) {
      fail(`edge ${edge.from} -> ${edge.to} has unknown kind "${edge.kind}" (expected one of: ${EDGE_KIND_NAMES.join(", ")})`);
    }
  }

  for (const item of spec.legend ?? []) {
    if (!item.label) fail("every legend item needs a `label`");
    checkText(item.label, LIMITS.label, `legend item "${item.label}"`);
    if (!item.kind && !item.edgeKind) fail(`legend item "${item.label}" needs a \`kind\` or \`edgeKind\``);
    if (item.kind && !ROLE_NAMES.includes(item.kind)) fail(`legend item "${item.label}" has unknown kind "${item.kind}"`);
    if (item.edgeKind && !EDGE_KIND_NAMES.includes(item.edgeKind)) {
      fail(`legend item "${item.label}" has unknown edgeKind "${item.edgeKind}"`);
    }
  }

  return { ...spec, baseDir };
}

function contains(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/**
 * Reads the icons a spec names. `icon` is documented as a filename inside
 * `iconsDir` or a path relative to the spec, and that is exactly what is
 * allowed: the resolved file must canonically live under one of those two
 * roots. Symlinks still work — `realpath()` follows them and then checks where
 * they landed — so a shared, symlinked icon directory keeps working while a
 * link out of the tree does not.
 */
export async function loadIcons(spec) {
  const files = {};
  const byNode = new Map();
  const baseRoot = await fs.realpath(spec.baseDir);
  let iconsRoot = baseRoot;
  if (spec.iconsDir) {
    const requested = path.resolve(spec.baseDir, spec.iconsDir);
    try {
      iconsRoot = await fs.realpath(requested);
    } catch {
      throw new Error(`\`iconsDir\` does not exist: ${requested}`);
    }
  }

  for (const node of spec.nodes) {
    if (!node.icon) continue;
    if (typeof node.icon !== "string") throw new Error(`Icon for node ${node.id} must be a path string`);
    if (path.isAbsolute(node.icon)) {
      throw new Error(`Icon for node ${node.id} must be relative to the spec or \`iconsDir\`: ${node.icon}`);
    }
    if (!/\.svg$/i.test(node.icon)) {
      throw new Error(`Icon for node ${node.id} must be an .svg file: ${node.icon}`);
    }
    const root = node.icon.includes("/") ? baseRoot : iconsRoot;
    let iconPath;
    try {
      iconPath = await fs.realpath(path.resolve(root, node.icon));
    } catch {
      throw new Error(`Icon for node ${node.id} not found: ${path.resolve(root, node.icon)}`);
    }
    if (!contains(baseRoot, iconPath) && !contains(iconsRoot, iconPath)) {
      throw new Error(
        `Icon for node ${node.id} resolves outside the spec and icon directories: ${iconPath}`,
      );
    }
    const stat = await fs.stat(iconPath);
    if (!stat.isFile()) throw new Error(`Icon for node ${node.id} is not a regular file: ${iconPath}`);
    if (stat.size > LIMITS.iconBytes) {
      throw new Error(`Icon ${iconPath} is larger than the ${LIMITS.iconBytes} byte limit`);
    }
    const svg = await fs.readFile(iconPath, "utf8");
    if (!/^\s*(<\?xml|<!--|<svg)/i.test(svg)) {
      throw new Error(`Icon ${iconPath} is not an SVG document`);
    }
    if (/<script|\son\w+\s*=|<foreignObject|xlink:href\s*=\s*["']\s*https?:|href\s*=\s*["']\s*https?:/i.test(svg)) {
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
