/**
 * Visual system for generated architecture diagrams.
 *
 * Every value here exists so that a generated scene looks deliberate: one type
 * scale, one spacing scale, a small set of semantic roles, and connectors that
 * stay quieter than the boxes they connect.
 */

const ROLES = {
  actor: { fill: "#f1f3f5", stroke: "#343a40" },
  client: { fill: "#d0ebff", stroke: "#1971c2" },
  edge: { fill: "#e5dbff", stroke: "#6741d9" },
  service: { fill: "#dbe4ff", stroke: "#364fc7" },
  worker: { fill: "#c5f6fa", stroke: "#0b7285" },
  queue: { fill: "#ffec99", stroke: "#e67700" },
  store: { fill: "#d3f9d8", stroke: "#2b8a3e" },
  external: { fill: "#ffdeeb", stroke: "#a61e4d" },
  platform: { fill: "#e9ecef", stroke: "#495057" },
  accent: { fill: "#ffd8a8", stroke: "#d9480f" },
};

const GROUP_KINDS = {
  zone: {
    fill: "#f8f9fa",
    stroke: "#adb5bd",
    strokeStyle: "solid",
    titleColor: "#495057",
  },
  boundary: {
    fill: "transparent",
    stroke: "#e8590c",
    strokeStyle: "dashed",
    titleColor: "#d9480f",
  },
  plain: {
    fill: "transparent",
    stroke: "#ced4da",
    strokeStyle: "solid",
    titleColor: "#868e96",
  },
};

const EDGE_KINDS = {
  sync: { stroke: "#495057", strokeStyle: "solid", endArrowhead: "arrow" },
  async: { stroke: "#e67700", strokeStyle: "dashed", endArrowhead: "arrow" },
  data: { stroke: "#1864ab", strokeStyle: "solid", endArrowhead: "arrow" },
  control: { stroke: "#7d8590", strokeStyle: "dotted", endArrowhead: "arrow" },
  secure: { stroke: "#a61e4d", strokeStyle: "solid", endArrowhead: "arrow" },
};

const STYLES = {
  clean: { roughness: 0, fontFamily: 6, edgeFontFamily: 6, fillStyle: "solid" },
  sketch: { roughness: 1, fontFamily: 5, edgeFontFamily: 5, fillStyle: "solid" },
};

export const DEFAULTS = {
  style: "clean",
  layout: {
    nodeWidth: 210,
    minNodeHeight: 74,
    colGap: 104,
    rowGap: 58,
    margin: 56,
    nodePadX: 14,
    nodePadY: 14,
    iconSize: 30,
    iconGap: 8,
    sublabelGap: 5,
    groupPad: 26,
    groupTitleHeight: 30,
    groupSeparation: 14,
    laneStep: 16,
    titleGap: 40,
  },
  font: {
    title: 30,
    subtitle: 16,
    label: 16,
    sublabel: 12,
    edge: 12,
    groupTitle: 14,
    note: 12,
  },
  colors: {
    canvas: "#ffffff",
    text: "#1e1e1e",
    muted: "#5c6773",
    title: "#101828",
  },
};

export function resolveTheme(spec = {}) {
  const styleName = spec.style && STYLES[spec.style] ? spec.style : DEFAULTS.style;
  return {
    styleName,
    ...STYLES[styleName],
    layout: { ...DEFAULTS.layout, ...(spec.layout ?? {}) },
    font: { ...DEFAULTS.font, ...(spec.font ?? {}) },
    colors: { ...DEFAULTS.colors, ...(spec.colors ?? {}) },
    roles: { ...ROLES, ...(spec.roles ?? {}) },
    groupKinds: { ...GROUP_KINDS, ...(spec.groupKinds ?? {}) },
    edgeKinds: { ...EDGE_KINDS, ...(spec.edgeKinds ?? {}) },
  };
}

export function roleStyle(theme, kind) {
  return theme.roles[kind] ?? theme.roles.service;
}

export function groupStyle(theme, kind) {
  return theme.groupKinds[kind] ?? theme.groupKinds.zone;
}

export function edgeStyle(theme, kind) {
  return theme.edgeKinds[kind] ?? theme.edgeKinds.sync;
}

export const ROLE_NAMES = Object.keys(ROLES);
export const GROUP_KIND_NAMES = Object.keys(GROUP_KINDS);
export const EDGE_KIND_NAMES = Object.keys(EDGE_KINDS);
