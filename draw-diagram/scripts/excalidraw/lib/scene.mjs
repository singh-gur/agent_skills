/**
 * Skeleton assembly: turns the laid-out spec into Excalidraw's element
 * skeleton plus a small set of post-conversion geometry patches. Ids are
 * explicit so bindings can be wired without guessing generated ids.
 */

import { placeEdgeLabels } from "./route.mjs";
import { edgeStyle, groupStyle, roleStyle } from "./theme.mjs";

function longestRun(edge) {
  const points = edge.route.points;
  let longest = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    longest = Math.max(
      longest,
      Math.abs(points[index + 1].x - points[index].x) + Math.abs(points[index + 1].y - points[index].y),
    );
  }
  return longest;
}

const shared = (theme) => ({
  roughness: theme.roughness,
  fillStyle: theme.fillStyle,
  opacity: 100,
});

export async function buildScene({ spec, theme, layout, edges, icons, measure }) {
  const L = theme.layout;
  const skeleton = [];
  const patches = {};
  const warnings = [];

  const measureEdgeLabels = async (widths) =>
    measure(
      edges.map((edge, index) => ({
        text: edge.label ?? "",
        fontSize: theme.font.edge,
        fontFamily: theme.edgeFontFamily,
        ...(widths?.[index] ? { maxWidth: widths[index] } : {}),
      })),
    ).then((sizes) => sizes.map((size, index) => (edges[index].label ? size : null)));

  let edgeLabelSizes = await measureEdgeLabels();
  placeEdgeLabels({ edges, sizes: edgeLabelSizes, obstacles: layout.obstacles });

  // A label with nowhere to sit usually just needs to be narrower: wrap it to
  // the longest straight run of its own connector and place everything again.
  const rewrap = edges.map((edge, index) =>
    edge.label_box?.crowded && edgeLabelSizes[index]
      ? Math.max(70, longestRun(edge) - 34)
      : null,
  );
  if (rewrap.some(Boolean)) {
    edgeLabelSizes = await measureEdgeLabels(rewrap);
    placeEdgeLabels({ edges, sizes: edgeLabelSizes, obstacles: layout.obstacles });
  }

  const extraTexts = [
    spec.title ? { text: spec.title, fontSize: theme.font.title, fontFamily: theme.fontFamily } : null,
    spec.subtitle ? { text: spec.subtitle, fontSize: theme.font.subtitle, fontFamily: theme.fontFamily } : null,
    spec.note ? { text: spec.note, fontSize: theme.font.note, fontFamily: theme.fontFamily } : null,
    ...(spec.legend ?? []).map((item) => ({
      text: item.label,
      fontSize: theme.font.note,
      fontFamily: theme.fontFamily,
    })),
  ].filter(Boolean);
  const measured = extraTexts.length > 0 ? await measure(extraTexts) : [];
  let measuredIndex = 0;
  const titleText = spec.title ? measured[measuredIndex++] : null;
  const subtitleText = spec.subtitle ? measured[measuredIndex++] : null;
  const noteText = spec.note ? measured[measuredIndex++] : null;
  const legendTexts = (spec.legend ?? []).map(() => measured[measuredIndex++]);

  // Groups sit behind everything else.
  for (const group of layout.groups) {
    const style = groupStyle(theme, group.kind);
    skeleton.push({
      type: "rectangle",
      id: group.id,
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
      strokeColor: style.stroke,
      backgroundColor: style.fill,
      strokeStyle: style.strokeStyle,
      strokeWidth: 1,
      roundness: { type: 3 },
      ...shared(theme),
    });
    if (group.title) {
      skeleton.push({
        type: "text",
        id: `${group.id}-title`,
        x: group.titleBox.x,
        y: group.titleBox.y,
        text: group.titleText.text,
        fontSize: theme.font.groupTitle,
        fontFamily: theme.fontFamily,
        strokeColor: style.titleColor,
        textAlign: "left",
        verticalAlign: "top",
        ...shared(theme),
      });
    }
  }

  // Connectors are drawn beneath the boxes so stubs never sit on top of a fill.
  const boundArrows = new Map();
  for (const edge of edges) {
    const style = edgeStyle(theme, edge.kind);
    const points = edge.route.points;
    const origin = points[0];
    if (edge.route.degraded) {
      warnings.push(`connector ${edge.from} -> ${edge.to} could not find a clean route`);
    }
    if (edge.route.crossings?.length > 0) {
      warnings.push(
        `connector ${edge.from} -> ${edge.to} passes through ${edge.route.crossings.join(", ")}`,
      );
    }
    skeleton.push({
      type: "arrow",
      id: edge.key,
      x: origin.x,
      y: origin.y,
      points: points.map((point) => [point.x - origin.x, point.y - origin.y]),
      strokeColor: edge.color ?? style.stroke,
      strokeStyle: edge.strokeStyle ?? style.strokeStyle,
      strokeWidth: 1,
      roundness: null,
      startArrowhead: edge.bidirectional ? "arrow" : null,
      endArrowhead: style.endArrowhead,
      ...shared(theme),
    });
    patches[edge.key] = {
      startBinding: { elementId: edge.from, focus: 0, gap: 4 },
      endBinding: { elementId: edge.to, focus: 0, gap: 4 },
    };
    for (const nodeId of [edge.from, edge.to]) {
      if (!boundArrows.has(nodeId)) boundArrows.set(nodeId, []);
      boundArrows.get(nodeId).push({ id: edge.key, type: "arrow" });
    }
  }

  // Connector labels are emitted last so they sit above every box and lane.
  const edgeLabelElements = [];
  edges.forEach((edge, index) => {
    const size = edgeLabelSizes[index];
    if (!size) return;
    const box = edge.label_box;
    if (edge.route.degraded || box.crowded) {
      warnings.push(`label "${edge.label}" (${edge.from} -> ${edge.to}) had no clear space on its path`);
    }
    if (box.masked) {
      edgeLabelElements.push({
        type: "rectangle",
        id: `${edge.key}-label-bg`,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        strokeColor: "transparent",
        backgroundColor: theme.colors.canvas,
        fillStyle: "solid",
        strokeWidth: 1,
        roughness: 0,
        roundness: null,
        opacity: 100,
        groupIds: [`g-${edge.key}`],
      });
    }
    edgeLabelElements.push({
      type: "text",
      id: `${edge.key}-label`,
      x: box.x + (box.width - size.width) / 2,
      y: box.y + (box.height - size.height) / 2,
      text: size.text,
      fontSize: theme.font.edge,
      fontFamily: theme.edgeFontFamily,
      strokeColor: edge.labelColor ?? theme.colors.muted,
      textAlign: "left",
      verticalAlign: "top",
      groupIds: [`g-${edge.key}`],
      ...shared(theme),
    });
  });

  // Nodes: box with a bound label, plus optional icon and sublabel in one group.
  for (const node of layout.nodes) {
    const style = roleStyle(theme, node.kind);
    const groupId = `g-${node.id}`;
    const iconBlock = node.icon ? L.iconSize + L.iconGap : 0;
    const subBlock = node.sublabelText ? node.sublabelText.height + L.sublabelGap : 0;
    const contentHeight = iconBlock + node.labelText.height + subBlock;
    const top = node.y + (node.height - contentHeight) / 2;

    skeleton.push({
      type: "rectangle",
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      strokeColor: node.stroke ?? style.stroke,
      backgroundColor: node.fill ?? style.fill,
      strokeWidth: 2,
      strokeStyle: "solid",
      roundness: { type: 3 },
      groupIds: [groupId],
      ...shared(theme),
      label: {
        text: node.labelText.text,
        fontSize: theme.font.label,
        fontFamily: theme.fontFamily,
        strokeColor: node.textColor ?? theme.colors.text,
        textAlign: "center",
        verticalAlign: "middle",
      },
    });
    patches[`text:${node.id}`] = {
      x: node.cx - node.labelText.width / 2,
      y: top + iconBlock,
    };
    if (boundArrows.has(node.id)) {
      patches[node.id] = { addBoundElements: boundArrows.get(node.id) };
    }

    const fileId = icons.byNode.get(node.id);
    if (fileId) {
      skeleton.push({
        type: "image",
        id: `${node.id}-icon`,
        fileId,
        x: node.cx - L.iconSize / 2,
        y: top,
        width: L.iconSize,
        height: L.iconSize,
        groupIds: [groupId],
        opacity: 100,
      });
    }

    if (node.sublabelText) {
      skeleton.push({
        type: "text",
        id: `${node.id}-sub`,
        // Excalidraw re-anchors centered standalone text, so pass the centre itself.
        x: node.cx,
        y: top + iconBlock + node.labelText.height + L.sublabelGap,
        text: node.sublabelText.text,
        fontSize: theme.font.sublabel,
        fontFamily: theme.fontFamily,
        strokeColor: theme.colors.muted,
        textAlign: "center",
        verticalAlign: "top",
        groupIds: [groupId],
        ...shared(theme),
      });
    }

    if (node.labelText.width > node.width - 2 * L.nodePadX + 1) {
      warnings.push(`label of ${node.id} is wider than its box`);
    }
    if (contentHeight > node.height - 2) {
      warnings.push(`content of ${node.id} is taller than its box`);
    }
  }

  skeleton.push(...edgeLabelElements);

  // Title block above the drawing, legend and note below it.
  const left = layout.content.minX;
  let headerBottom = layout.content.minY - L.titleGap;
  if (subtitleText) {
    headerBottom -= subtitleText.height;
    skeleton.push({
      type: "text",
      id: "diagram-subtitle",
      x: left,
      y: headerBottom,
      text: subtitleText.text,
      fontSize: theme.font.subtitle,
      fontFamily: theme.fontFamily,
      strokeColor: theme.colors.muted,
      textAlign: "left",
      verticalAlign: "top",
      ...shared(theme),
    });
    headerBottom -= 10;
  }
  if (titleText) {
    headerBottom -= titleText.height;
    skeleton.push({
      type: "text",
      id: "diagram-title",
      x: left,
      y: headerBottom,
      text: titleText.text,
      fontSize: theme.font.title,
      fontFamily: theme.fontFamily,
      strokeColor: theme.colors.title,
      textAlign: "left",
      verticalAlign: "top",
      ...shared(theme),
    });
  }

  let footerTop = layout.content.maxY + 36;
  if ((spec.legend ?? []).length > 0) {
    let cursorX = left;
    (spec.legend ?? []).forEach((item, index) => {
      const text = legendTexts[index];
      const swatchWidth = 30;
      const swatchHeight = 15;
      if (item.edgeKind) {
        const style = edgeStyle(theme, item.edgeKind);
        skeleton.push({
          type: "arrow",
          id: `legend-${index}-mark`,
          x: cursorX,
          y: footerTop + text.height / 2,
          points: [
            [0, 0],
            [swatchWidth, 0],
          ],
          strokeColor: style.stroke,
          strokeStyle: style.strokeStyle,
          strokeWidth: 1,
          roundness: null,
          endArrowhead: style.endArrowhead,
          ...shared(theme),
        });
      } else {
        const style = roleStyle(theme, item.kind);
        skeleton.push({
          type: "rectangle",
          id: `legend-${index}-mark`,
          x: cursorX,
          y: footerTop + (text.height - swatchHeight) / 2,
          width: swatchWidth,
          height: swatchHeight,
          strokeColor: style.stroke,
          backgroundColor: style.fill,
          strokeWidth: 1,
          roundness: { type: 3 },
          ...shared(theme),
        });
      }
      skeleton.push({
        type: "text",
        id: `legend-${index}-label`,
        x: cursorX + swatchWidth + 9,
        y: footerTop,
        text: text.text,
        fontSize: theme.font.note,
        fontFamily: theme.fontFamily,
        strokeColor: theme.colors.muted,
        textAlign: "left",
        verticalAlign: "top",
        ...shared(theme),
      });
      cursorX += swatchWidth + 9 + text.width + 30;
    });
    footerTop += (legendTexts[0]?.height ?? 16) + 18;
  }
  if (noteText) {
    skeleton.push({
      type: "text",
      id: "diagram-note",
      x: left,
      y: footerTop,
      text: noteText.text,
      fontSize: theme.font.note,
      fontFamily: theme.fontFamily,
      strokeColor: theme.colors.muted,
      textAlign: "left",
      verticalAlign: "top",
      ...shared(theme),
    });
  }

  return { skeleton, patches, warnings, files: icons.files };
}
