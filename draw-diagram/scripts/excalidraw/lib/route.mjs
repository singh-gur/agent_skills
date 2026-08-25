/**
 * Orthogonal connector routing.
 *
 * Connectors leave a node from a chosen side, travel only through the free
 * lanes between grid tracks, and enter the target head-on. Candidate shapes
 * (straight, L, Z) are scored first because they read best; a channel-graph
 * search is the fallback when the obvious shapes are blocked.
 */

const TURN_COST = 70;
const CROSS_COST = 34;
const STUB = 22;
const EPS = 0.5;

const HORIZONTAL = new Set(["left", "right"]);

function anchorPoint(node, side, offset = 0) {
  switch (side) {
    case "left":
      return { x: node.x, y: node.cy + offset };
    case "right":
      return { x: node.x + node.width, y: node.cy + offset };
    case "top":
      return { x: node.cx + offset, y: node.y };
    default:
      return { x: node.cx + offset, y: node.y + node.height };
  }
}

function outward(side) {
  return { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } }[side];
}

function segmentHitsRect(a, b, rect) {
  const minX = Math.min(a.x, b.x) - EPS;
  const maxX = Math.max(a.x, b.x) + EPS;
  const minY = Math.min(a.y, b.y) - EPS;
  const maxY = Math.max(a.y, b.y) + EPS;
  return (
    minX < rect.x + rect.width &&
    maxX > rect.x &&
    minY < rect.y + rect.height &&
    maxY > rect.y
  );
}

function pathBlocked(points, obstacles, ignore) {
  for (let index = 0; index + 1 < points.length; index += 1) {
    for (const rect of obstacles) {
      if (ignore.has(rect.id)) continue;
      if (segmentHitsRect(points[index], points[index + 1], rect)) return true;
    }
  }
  return false;
}

function borderCrossings(points, groups) {
  let crossings = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    for (const group of groups) {
      const insideA = a.x > group.x && a.x < group.x + group.width && a.y > group.y && a.y < group.y + group.height;
      const insideB = b.x > group.x && b.x < group.x + group.width && b.y > group.y && b.y < group.y + group.height;
      if (insideA !== insideB) crossings += 1;
    }
  }
  return crossings;
}

function simplify(points) {
  const output = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = output[output.length - 1];
    const current = points[index];
    const next = points[index + 1];
    const collinear =
      (Math.abs(previous.x - current.x) < EPS && Math.abs(current.x - next.x) < EPS) ||
      (Math.abs(previous.y - current.y) < EPS && Math.abs(current.y - next.y) < EPS);
    const duplicate = Math.abs(previous.x - current.x) < EPS && Math.abs(previous.y - current.y) < EPS;
    if (!collinear && !duplicate) output.push(current);
  }
  output.push(points[points.length - 1]);
  return output;
}

function pathCost(points, groups) {
  let length = 0;
  let bends = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    length += Math.abs(points[index + 1].x - points[index].x) + Math.abs(points[index + 1].y - points[index].y);
  }
  bends = Math.max(0, points.length - 2);
  return length + bends * TURN_COST + borderCrossings(points, groups) * CROSS_COST;
}

function candidatePaths(start, startSide, end, endSide, channels) {
  const so = outward(startSide);
  const eo = outward(endSide);
  const s1 = { x: start.x + so.x * STUB, y: start.y + so.y * STUB };
  const e1 = { x: end.x + eo.x * STUB, y: end.y + eo.y * STUB };
  const paths = [];

  // Straight shot.
  if (Math.abs(start.x - end.x) < EPS || Math.abs(start.y - end.y) < EPS) {
    paths.push([start, end]);
  }

  // L shape: perpendicular sides meeting at one corner.
  if (HORIZONTAL.has(startSide) !== HORIZONTAL.has(endSide)) {
    const corner = HORIZONTAL.has(startSide) ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
    paths.push([start, corner, end]);
  }

  // Z shape through a lane between the two nodes.
  if (HORIZONTAL.has(startSide) && HORIZONTAL.has(endSide)) {
    const lo = Math.min(s1.x, e1.x);
    const hi = Math.max(s1.x, e1.x);
    const lanes = channels.xs.filter((x) => x >= lo - EPS && x <= hi + EPS);
    lanes.push((s1.x + e1.x) / 2);
    for (const x of lanes) {
      paths.push([start, { x, y: start.y }, { x, y: end.y }, end]);
    }
  }
  if (!HORIZONTAL.has(startSide) && !HORIZONTAL.has(endSide)) {
    const lo = Math.min(s1.y, e1.y);
    const hi = Math.max(s1.y, e1.y);
    const lanes = channels.ys.filter((y) => y >= lo - EPS && y <= hi + EPS);
    lanes.push((s1.y + e1.y) / 2);
    for (const y of lanes) {
      paths.push([start, { x: start.x, y }, { x: end.x, y }, end]);
    }
  }

  // U shape: same side on both ends, detour through an outer lane.
  if (startSide === endSide) {
    if (HORIZONTAL.has(startSide)) {
      const pick = startSide === "right"
        ? Math.max(s1.x, e1.x)
        : Math.min(s1.x, e1.x);
      const lanes = channels.xs.filter((x) => (startSide === "right" ? x >= pick : x <= pick));
      const x = startSide === "right" ? Math.min(...lanes, pick + 40) : Math.max(...lanes, pick - 40);
      paths.push([start, { x, y: start.y }, { x, y: end.y }, end]);
    } else {
      const pick = startSide === "bottom" ? Math.max(s1.y, e1.y) : Math.min(s1.y, e1.y);
      const lanes = channels.ys.filter((y) => (startSide === "bottom" ? y >= pick : y <= pick));
      const y = startSide === "bottom" ? Math.min(...lanes, pick + 40) : Math.max(...lanes, pick - 40);
      paths.push([start, { x: start.x, y }, { x: end.x, y }, end]);
    }
  }

  // Staircase through one lane on each axis.
  const xLanes = channels.xs.filter((x) => Math.abs(x - start.x) > STUB || Math.abs(x - end.x) > STUB);
  const yLanes = channels.ys;
  for (const x of xLanes) {
    for (const y of yLanes) {
      if (HORIZONTAL.has(startSide) && HORIZONTAL.has(endSide)) {
        paths.push([start, { x, y: start.y }, { x, y }, { x: e1.x, y }, { x: e1.x, y: end.y }, end]);
      } else if (HORIZONTAL.has(startSide) && !HORIZONTAL.has(endSide)) {
        paths.push([start, { x, y: start.y }, { x, y }, { x: end.x, y }, end]);
      } else if (!HORIZONTAL.has(startSide) && HORIZONTAL.has(endSide)) {
        paths.push([start, { x: start.x, y }, { x, y }, { x, y: end.y }, end]);
      } else {
        paths.push([start, { x: start.x, y }, { x, y }, { x, y: e1.y }, { x: end.x, y: e1.y }, end]);
      }
    }
  }

  return paths;
}

function preferredSides(from, to) {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const verticalOverlap = Math.min(from.y + from.height, to.y + to.height) - Math.max(from.y, to.y);

  // Boxes that share a row read best connected side to side.
  const horizontalFirst = Math.abs(dx) >= Math.abs(dy) || verticalOverlap > 0;
  const primary = horizontalFirst ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
  const secondary = horizontalFirst
    ? dy >= 0
      ? "bottom"
      : "top"
    : dx >= 0
      ? "right"
      : "left";
  const targetPrimary = horizontalFirst
    ? dx >= 0
      ? "left"
      : "right"
    : dy >= 0
      ? "top"
      : "bottom";
  const targetSecondary = horizontalFirst
    ? dy >= 0
      ? "top"
      : "bottom"
    : dx >= 0
      ? "left"
      : "right";

  return {
    source: [...new Set([primary, secondary])],
    target: [...new Set([targetPrimary, targetSecondary])],
  };
}

function bestPath({ from, to, fromSide, toSide, fromOffset, toOffset, channels, obstacles, groups }) {
  const ignore = new Set([from.id, to.id]);
  let best = null;
  const sourceSides = fromSide ? [fromSide] : preferredSides(from, to).source;
  const targetSides = toSide ? [toSide] : preferredSides(from, to).target;

  for (const sSide of sourceSides) {
    for (const tSide of targetSides) {
      const start = anchorPoint(from, sSide, fromOffset ?? 0);
      const end = anchorPoint(to, tSide, toOffset ?? 0);
      for (const raw of candidatePaths(start, sSide, end, tSide, channels)) {
        const points = simplify(raw);
        if (points.length > 6) continue;
        if (pathBlocked(points, obstacles, ignore)) continue;
        const cost = pathCost(points, groups) + (sSide === sourceSides[0] ? 0 : 25) + (tSide === targetSides[0] ? 0 : 25);
        if (!best || cost < best.cost) best = { cost, points, fromSide: sSide, toSide: tSide };
      }
    }
  }

  if (!best) {
    const sSide = sourceSides[0];
    const tSide = targetSides[0];
    const start = anchorPoint(from, sSide, fromOffset ?? 0);
    const end = anchorPoint(to, tSide, toOffset ?? 0);
    const so = outward(sSide);
    const eo = outward(tSide);
    const s1 = { x: start.x + so.x * STUB, y: start.y + so.y * STUB };
    const e1 = { x: end.x + eo.x * STUB, y: end.y + eo.y * STUB };
    best = {
      cost: Infinity,
      points: simplify([start, s1, { x: s1.x, y: e1.y }, e1, end]),
      fromSide: sSide,
      toSide: tSide,
      degraded: true,
    };
  }
  return best;
}

/** Spread connectors that share a node side so arrowheads never stack up. */
function assignAnchorOffsets(edges, nodesById) {
  const buckets = new Map();
  for (const edge of edges) {
    for (const end of ["from", "to"]) {
      const nodeId = edge[end];
      const side = end === "from" ? edge.route.fromSide : edge.route.toSide;
      const key = `${nodeId}:${side}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ edge, end, side });
    }
  }
  const offsets = new Map();
  for (const [key, entries] of buckets) {
    if (entries.length < 2) continue;
    const [nodeId, side] = key.split(":");
    const node = nodesById.get(nodeId);
    const along = HORIZONTAL.has(side) ? "y" : "x";
    const size = HORIZONTAL.has(side) ? node.height : node.width;
    entries.sort((a, b) => {
      const otherA = nodesById.get(a.end === "from" ? a.edge.to : a.edge.from);
      const otherB = nodesById.get(b.end === "from" ? b.edge.to : b.edge.from);
      return (along === "y" ? otherA.cy - otherB.cy : otherA.cx - otherB.cx);
    });
    const usable = Math.max(0, size - 28);
    const step = Math.min(22, entries.length > 1 ? usable / (entries.length - 1) : 0);
    entries.forEach((entry, index) => {
      const offset = (index - (entries.length - 1) / 2) * step;
      offsets.set(`${entry.edge.key}:${entry.end}`, offset);
    });
  }
  return offsets;
}

/** Nudge connectors that share a lane apart so parallel runs stay distinguishable. */
function applyLaneOffsets(edges, obstacles, laneStep) {
  const runs = [];
  edges.forEach((edge) => {
    const points = edge.route.points;
    for (let index = 1; index + 2 < points.length; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      if (Math.abs(a.x - b.x) < EPS) {
        runs.push({ edge, axis: "x", key: Math.round(a.x), lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y), indices: [index, index + 1] });
      } else if (Math.abs(a.y - b.y) < EPS) {
        runs.push({ edge, axis: "y", key: Math.round(a.y), lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x), indices: [index, index + 1] });
      }
    }
  });

  const groups = new Map();
  for (const run of runs) {
    const key = `${run.axis}:${run.key}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }

  for (const overlapping of groups.values()) {
    if (overlapping.length < 2) continue;
    overlapping.sort((a, b) => a.lo - b.lo);
    const lanes = [];
    for (const run of overlapping) {
      let lane = 0;
      while (lanes[lane]?.some((other) => run.lo < other.hi - 4 && other.lo < run.hi - 4)) lane += 1;
      lanes[lane] = lanes[lane] ?? [];
      lanes[lane].push(run);
      run.lane = lane;
    }
    const laneCount = lanes.length;
    if (laneCount < 2) continue;
    for (const run of overlapping) {
      const delta = (run.lane - (laneCount - 1) / 2) * laneStep;
      if (delta === 0) continue;
      const points = run.edge.route.points;
      const snapshot = points.map((point) => ({ ...point }));
      for (const index of run.indices) {
        if (index === 0 || index === points.length - 1) continue;
        points[index][run.axis] += delta;
      }
      const ignore = new Set([run.edge.from, run.edge.to]);
      if (pathBlocked(points, obstacles, ignore)) {
        run.edge.route.points = snapshot;
      }
    }
  }
}

function segmentsOf(edge) {
  const points = edge.route.points;
  const segments = [];
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const terminal = index === 0 || index + 2 === points.length;
    if (Math.abs(a.x - b.x) < EPS) {
      segments.push({ axis: "x", coord: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y), terminal, index });
    } else if (Math.abs(a.y - b.y) < EPS) {
      segments.push({ axis: "y", coord: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x), terminal, index });
    }
  }
  return segments;
}

/**
 * Two connectors that share a node row or column can end up drawn on top of one
 * another where they leave or enter a box. Lane offsets cannot fix that (the
 * endpoint is pinned), so nudge the anchor instead and let the caller re-route.
 * Returns true when an anchor moved.
 */
const NUDGES = [16, -16, 32, -32, 48, -48];

function adjustTerminalOverlaps(edges, nodesById) {
  const moved = new Set();
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      for (const segA of segmentsOf(edges[i])) {
        for (const segB of segmentsOf(edges[j])) {
          if (segA.axis !== segB.axis) continue;
          if (Math.abs(segA.coord - segB.coord) > 4) continue;
          if (Math.min(segA.hi, segB.hi) - Math.max(segA.lo, segB.lo) < 12) continue;
          if (!segA.terminal && !segB.terminal) continue;

          const victim = segA.terminal ? edges[i] : edges[j];
          const segment = segA.terminal ? segA : segB;
          const end = segment.index === 0 ? "from" : "to";
          const handle = `${victim.key}:${end}`;
          if (moved.has(handle)) continue;

          const node = nodesById.get(victim[end]);
          const side = end === "from" ? victim.route.fromSide : victim.route.toSide;
          const limit = Math.max(0, (HORIZONTAL.has(side) ? node.height : node.width) / 2 - 16);
          const attempt = victim.nudges?.[end] ?? 0;
          if (attempt >= NUDGES.length) continue;
          const base = end === "from" ? victim.baseFromOffset : victim.baseToOffset;

          // Keep the nudged anchor clear of the other connectors already
          // attached to this side, or the arrowheads merge into one blob.
          const neighbours = edges
            .filter((other) => other !== victim)
            .flatMap((other) => [
              other.from === victim[end] && other.route.fromSide === side ? other.fromOffset ?? 0 : null,
              other.to === victim[end] && other.route.toSide === side ? other.toOffset ?? 0 : null,
            ])
            .filter((value) => value !== null);

          let chosen = null;
          let used = attempt;
          for (let index = attempt; index < NUDGES.length; index += 1) {
            const candidate = base + NUDGES[index];
            if (Math.abs(candidate) > limit) continue;
            if (neighbours.some((value) => Math.abs(value - candidate) < 18)) continue;
            chosen = candidate;
            used = index;
            break;
          }
          if (chosen === null) continue;

          victim.nudges = { ...(victim.nudges ?? {}), [end]: used + 1 };
          victim[end === "from" ? "fromOffset" : "toOffset"] = chosen;
          moved.add(handle);
        }
      }
    }
  }
  return moved.size > 0;
}

export function routeEdges({ nodes, edges, channels, obstacles, groups, laneStep = 16 }) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const prepared = edges.map((edge, index) => ({ ...edge, key: `e${index}` }));

  for (const edge of prepared) {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) throw new Error(`Edge ${edge.from} -> ${edge.to} references an unknown node`);
    edge.route = bestPath({
      from,
      to,
      fromSide: edge.fromSide,
      toSide: edge.toSide,
      channels,
      obstacles,
      groups,
    });
  }

  const offsets = assignAnchorOffsets(prepared, nodesById);
  const reroute = (edge) => {
    edge.route = bestPath({
      from: nodesById.get(edge.from),
      to: nodesById.get(edge.to),
      fromSide: edge.fromSide ?? edge.route.fromSide,
      toSide: edge.toSide ?? edge.route.toSide,
      fromOffset: edge.fromOffset ?? 0,
      toOffset: edge.toOffset ?? 0,
      channels,
      obstacles,
      groups,
    });
  };
  for (const edge of prepared) {
    edge.baseFromOffset = offsets.get(`${edge.key}:from`) ?? 0;
    edge.baseToOffset = offsets.get(`${edge.key}:to`) ?? 0;
    edge.fromOffset = edge.baseFromOffset;
    edge.toOffset = edge.baseToOffset;
  }

  // Route, spread shared lanes, then nudge any anchors that still collide, and
  // repeat until the picture settles.
  for (let pass = 0; pass < 4; pass += 1) {
    for (const edge of prepared) reroute(edge);
    applyLaneOffsets(prepared, obstacles, laneStep);
    if (!adjustTerminalOverlaps(prepared, nodesById)) break;
  }

  // Final audit: nothing should end up drawn through a box it does not touch.
  for (const edge of prepared) {
    const ignore = new Set([edge.from, edge.to]);
    edge.route.crossings = obstacles
      .filter((rect) => !ignore.has(rect.id))
      .filter((rect) =>
        edge.route.points.some((point, index) =>
          index + 1 < edge.route.points.length
            ? segmentHitsRect(point, edge.route.points[index + 1], rect)
            : false,
        ),
      )
      .map((rect) => rect.id);
  }
  return prepared;
}

/**
 * Place connector labels on a clear stretch of their own path. Every candidate
 * position is scored against boxes, group titles, other connectors, and labels
 * already placed, so a label never masks a line it does not belong to.
 */
export function placeEdgeLabels({ edges, sizes, obstacles, padX = 6, padY = 2 }) {
  const placed = [];
  const connectors = edges.flatMap((edge) =>
    segmentsOf(edge).map((segment) => ({
      key: edge.key,
      x: segment.axis === "y" ? segment.lo : segment.coord - 3,
      y: segment.axis === "y" ? segment.coord - 3 : segment.lo,
      width: segment.axis === "y" ? segment.hi - segment.lo : 6,
      height: segment.axis === "y" ? 6 : segment.hi - segment.lo,
    })),
  );

  // Arrowheads must stay legible: never let a label mask its own endpoints.
  const guards = new Map(
    edges.map((edge) => {
      const points = edge.route.points;
      const head = points[points.length - 1];
      const tail = points[0];
      return [
        edge.key,
        [
          { x: head.x - 20, y: head.y - 14, width: 40, height: 28 },
          { x: tail.x - 12, y: tail.y - 10, width: 24, height: 20 },
        ],
      ];
    }),
  );

  const withLabels = edges
    .map((edge, index) => ({ edge, size: sizes[index] }))
    .filter((entry) => entry.size);

  // Longest connectors pick first: they have the most room to give up.
  withLabels.sort((a, b) => pathLength(b.edge.route.points) - pathLength(a.edge.route.points));

  for (const { edge, size } of withLabels) {
    const box = { width: size.width + 2 * padX, height: size.height + 2 * padY };
    const foreign = connectors.filter((rect) => rect.key !== edge.key);
    const ownGuards = guards.get(edge.key);
    const points = edge.route.points;
    const longest = Math.max(
      ...segmentsOf(edge).map((segment) => segment.hi - segment.lo),
      1,
    );
    let best = null;

    for (let index = 0; index + 1 < points.length; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      const horizontal = Math.abs(a.y - b.y) < EPS;
      const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      const startTrim = index === 0 ? 16 : 8;
      const endTrim = index + 2 === points.length ? 28 : 8;
      const need = (horizontal ? box.width : box.height) + startTrim + endTrim;
      const sign = horizontal ? Math.sign(b.x - a.x) || 1 : Math.sign(b.y - a.y) || 1;
      const half = (horizontal ? box.width : box.height) / 2;
      const usable = Math.max(0, length - startTrim - endTrim - 2 * half);

      for (const fraction of [0.5, 0.3, 0.7, 0.12, 0.88]) {
        if (length < need && fraction !== 0.5) continue;
        const along = length < need ? length / 2 : startTrim + half + usable * fraction;
        const center = horizontal
          ? { x: a.x + sign * along, y: a.y }
          : { x: a.x, y: a.y + sign * along };
        const shifts = horizontal
          ? [{ x: 0, y: 0 }, { x: 0, y: -box.height / 2 - 7 }, { x: 0, y: box.height / 2 + 7 }]
          : [{ x: 0, y: 0 }, { x: box.width / 2 + 8, y: 0 }, { x: -box.width / 2 - 8, y: 0 }];
        for (const shift of shifts) {
          const rect = {
            x: center.x + shift.x - box.width / 2,
            y: center.y + shift.y - box.height / 2,
            width: box.width,
            height: box.height,
          };
          const masked = shift.x === 0 && shift.y === 0;
          const penalty =
            overlapArea(rect, obstacles) * 6 +
            overlapArea(rect, foreign) * 2 +
            overlapArea(rect, placed) * 4 +
            overlapArea(rect, ownGuards) * 25 +
            (masked ? 0 : 22) +
            (length < need ? 40 : 0) +
            // Prefer the roomiest run: a label on a long straight is easier to
            // attribute to its connector than one squeezed against a corner.
            36 * (1 - length / longest);
          if (!best || penalty < best.penalty) best = { rect, masked, penalty };
        }
      }
    }

    edge.label_box = { ...best.rect, masked: best.masked, crowded: best.penalty > 90 };
    placed.push(best.rect);
  }
  return edges;
}

function overlapArea(rect, others) {
  let area = 0;
  for (const other of others) {
    const width = Math.min(rect.x + rect.width, other.x + other.width) - Math.max(rect.x, other.x);
    const height = Math.min(rect.y + rect.height, other.y + other.height) - Math.max(rect.y, other.y);
    if (width > 0 && height > 0) area += (width * height) / 100;
  }
  return area;
}

function pathLength(points) {
  let length = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    length += Math.abs(points[index + 1].x - points[index].x) + Math.abs(points[index + 1].y - points[index].y);
  }
  return length;
}

