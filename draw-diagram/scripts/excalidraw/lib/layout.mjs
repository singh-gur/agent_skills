/**
 * Grid layout: nodes are placed on a column/row grid, groups are rectangular
 * cell ranges, and the gaps between tracks are widened wherever a group border
 * needs room. Everything downstream (routing, scene assembly) reads the boxes
 * this module produces.
 */

const CLEARANCE = 8;

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function trackPositions(sizes, gaps, start) {
  const positions = [];
  let cursor = start;
  for (let index = 0; index < sizes.length; index += 1) {
    positions.push(cursor);
    cursor += sizes[index] + (gaps[index + 1] ?? 0);
  }
  return positions;
}

function freeChannels(from, to, blockers, minWidth) {
  const cuts = blockers
    .filter((value) => value > from && value < to)
    .sort((a, b) => a - b);
  const edges = [from, ...cuts.flatMap((value) => [value - 1, value + 1]), to];
  const channels = [];
  for (let index = 0; index < edges.length; index += 2) {
    const lo = edges[index];
    const hi = edges[index + 1];
    if (hi - lo >= minWidth) channels.push({ position: (lo + hi) / 2, span: hi - lo });
  }
  return channels;
}

export async function computeLayout(spec, theme, measure) {
  const L = theme.layout;
  const nodes = spec.nodes.map((node) => ({ ...node }));
  const groups = (spec.groups ?? []).map((group) => ({ ...group }));

  const colCount = Math.max(...nodes.map((n) => n.col + (n.colSpan ?? 1)));
  const rowCount = Math.max(...nodes.map((n) => n.row + (n.rowSpan ?? 1)));

  // 1. Column widths come from declared node widths (spans borrow their tracks).
  const colWidths = Array.from({ length: colCount }, () => L.nodeWidth);
  for (const node of nodes) {
    if ((node.colSpan ?? 1) === 1 && node.width) {
      colWidths[node.col] = Math.max(colWidths[node.col], node.width);
    }
  }

  // 2. Gaps widen where group borders and group titles need room.
  const colGaps = Array.from({ length: colCount + 1 }, (_, boundary) =>
    boundary === 0 || boundary === colCount ? 0 : L.colGap,
  );
  const rowGaps = Array.from({ length: rowCount + 1 }, (_, boundary) =>
    boundary === 0 || boundary === rowCount ? 0 : L.rowGap,
  );
  for (const group of groups) {
    const [c0, c1] = group.cols;
    const [r0, r1] = group.rows;
    if (c0 > 0) colGaps[c0] += L.groupPad + L.groupSeparation;
    if (c1 + 1 < colCount) colGaps[c1 + 1] += L.groupPad + L.groupSeparation;
    if (r0 > 0) rowGaps[r0] += L.groupPad + L.groupTitleHeight + L.groupSeparation;
    if (r1 + 1 < rowCount) rowGaps[r1 + 1] += L.groupPad + L.groupSeparation;
  }

  const originX = L.margin + Math.max(...groups.map((g) => (g.cols[0] === 0 ? L.groupPad : 0)), 0);
  const originY =
    L.margin +
    Math.max(
      ...groups.map((g) => (g.rows[0] === 0 ? L.groupPad + L.groupTitleHeight : 0)),
      0,
    );
  const colX = trackPositions(colWidths, colGaps, originX);

  const spanWidth = (col, span) => {
    let width = 0;
    for (let index = col; index < col + span; index += 1) {
      width += colWidths[index];
      if (index + 1 < col + span) width += colGaps[index + 1];
    }
    return width;
  };

  // 3. Measure every label at its final wrap width, then derive node heights.
  const requests = [];
  for (const node of nodes) {
    node.boxWidth = node.width ?? spanWidth(node.col, node.colSpan ?? 1);
    const maxWidth = node.boxWidth - 2 * L.nodePadX;
    requests.push({
      text: node.label,
      fontSize: theme.font.label,
      fontFamily: theme.fontFamily,
      maxWidth,
    });
    if (node.sublabel) {
      requests.push({
        text: node.sublabel,
        fontSize: theme.font.sublabel,
        fontFamily: theme.fontFamily,
        maxWidth,
      });
    }
  }
  for (const group of groups) {
    requests.push({
      text: group.title ?? "",
      fontSize: theme.font.groupTitle,
      fontFamily: theme.fontFamily,
    });
  }
  const measured = await measure(requests);

  let cursor = 0;
  for (const node of nodes) {
    node.labelText = measured[cursor++];
    node.sublabelText = node.sublabel ? measured[cursor++] : null;
    const iconBlock = node.icon ? L.iconSize + L.iconGap : 0;
    const subBlock = node.sublabelText ? node.sublabelText.height + L.sublabelGap : 0;
    node.boxHeight =
      node.height ??
      Math.max(
        L.minNodeHeight,
        roundTo(2 * L.nodePadY + iconBlock + node.labelText.height + subBlock, 2),
      );
  }
  for (const group of groups) {
    group.titleText = measured[cursor++];
  }

  // 4. Row heights, then absolute placement inside each cell span.
  const rowHeights = Array.from({ length: rowCount }, () => 0);
  for (const node of nodes) {
    if ((node.rowSpan ?? 1) === 1) {
      rowHeights[node.row] = Math.max(rowHeights[node.row], node.boxHeight);
    }
  }
  for (let row = 0; row < rowCount; row += 1) {
    if (rowHeights[row] === 0) rowHeights[row] = L.minNodeHeight;
  }
  const rowY = trackPositions(rowHeights, rowGaps, originY);

  const spanHeight = (row, span) => {
    let height = 0;
    for (let index = row; index < row + span; index += 1) {
      height += rowHeights[index];
      if (index + 1 < row + span) height += rowGaps[index + 1];
    }
    return height;
  };

  for (const node of nodes) {
    const cellWidth = spanWidth(node.col, node.colSpan ?? 1);
    const cellHeight = spanHeight(node.row, node.rowSpan ?? 1);
    node.width = node.boxWidth;
    // A node that spans rows fills them; a single-row node keeps its own height.
    node.height = (node.rowSpan ?? 1) > 1 ? Math.max(node.boxHeight, cellHeight) : node.boxHeight;
    node.x = colX[node.col] + (cellWidth - node.width) / 2;
    node.y = rowY[node.row] + (cellHeight - node.height) / 2;
    node.cx = node.x + node.width / 2;
    node.cy = node.y + node.height / 2;
  }

  // 5. Group boxes wrap their cell range plus padding and a title band.
  for (const group of groups) {
    const [c0, c1] = group.cols;
    const [r0, r1] = group.rows;
    const left = colX[c0] - L.groupPad;
    const right = colX[c1] + colWidths[c1] + L.groupPad;
    const top = rowY[r0] - L.groupPad - L.groupTitleHeight;
    const bottom = rowY[r1] + rowHeights[r1] + L.groupPad;
    group.x = left;
    group.y = top;
    group.width = right - left;
    group.height = bottom - top;
    group.titleBox = {
      x: left + 16,
      y: top + (L.groupTitleHeight - (group.titleText?.height ?? 18)) / 2 + 6,
      width: group.titleText?.width ?? 0,
      height: group.titleText?.height ?? 18,
    };
  }

  // 6. Routing channels: the widest free lanes inside every gap, plus an outer ring.
  const contentMinX = Math.min(...nodes.map((n) => n.x), ...groups.map((g) => g.x));
  const contentMaxX = Math.max(
    ...nodes.map((n) => n.x + n.width),
    ...groups.map((g) => g.x + g.width),
  );
  const contentMinY = Math.min(...nodes.map((n) => n.y), ...groups.map((g) => g.y));
  const contentMaxY = Math.max(
    ...nodes.map((n) => n.y + n.height),
    ...groups.map((g) => g.y + g.height),
  );

  const groupEdgesX = groups.flatMap((g) => [g.x, g.x + g.width]);
  const groupEdgesY = groups.flatMap((g) => [g.y, g.y + g.height]);

  const channelXs = [contentMinX - L.margin * 0.6, contentMaxX + L.margin * 0.6];
  for (let col = 0; col + 1 < colCount; col += 1) {
    const from = colX[col] + colWidths[col];
    const to = colX[col + 1];
    for (const channel of freeChannels(from + CLEARANCE, to - CLEARANCE, groupEdgesX, 22)) {
      channelXs.push(channel.position);
    }
  }
  const channelYs = [contentMinY - L.margin * 0.6, contentMaxY + L.margin * 0.6];
  for (let row = 0; row + 1 < rowCount; row += 1) {
    const from = rowY[row] + rowHeights[row];
    const to = rowY[row + 1];
    for (const channel of freeChannels(from + CLEARANCE, to - CLEARANCE, groupEdgesY, 20)) {
      channelYs.push(channel.position);
    }
  }
  channelXs.sort((a, b) => a - b);
  channelYs.sort((a, b) => a - b);

  // 7. Obstacles: node boxes and group title bands, with a little clearance.
  const obstacles = [
    ...nodes.map((node) => ({
      x: node.x - CLEARANCE,
      y: node.y - CLEARANCE,
      width: node.width + 2 * CLEARANCE,
      height: node.height + 2 * CLEARANCE,
      id: node.id,
    })),
    ...groups.map((group) => ({
      x: group.titleBox.x - 8,
      y: group.y,
      width: group.titleBox.width + 16,
      height: L.groupTitleHeight,
      id: `${group.id}:title`,
    })),
  ];

  return {
    nodes,
    groups,
    obstacles,
    channels: { xs: channelXs, ys: channelYs },
    grid: { colX, colWidths, rowY, rowHeights, colGaps, rowGaps },
    content: { minX: contentMinX, minY: contentMinY, maxX: contentMaxX, maxY: contentMaxY },
  };
}
