import path from "node:path";
import { prepareOutput, writeFileNoFollow } from "./lib/safe-write.mjs";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_SVG_BYTES = 1024 * 1024;
const MAX_META_BYTES = 4 * 1024 * 1024;

/**
 * Vendors Iconify SVGs locally so diagram sources never depend on a runtime
 * fetch. Icons are sanitized, normalized to a fixed pixel size, and reported
 * with the provenance the skill requires.
 */

function usage() {
  return `Usage: npm run icons -- <prefix:name>[@#rrggbb] ... --out <dir>

Options:
  --out <dir>       Directory to write SVGs into (default: docs/assets/icons)
  --size <pixels>   width/height written into the SVG (default: 64)
  --force           Allow an --out directory outside the current directory
  --help            Show this help

Example:
  npm run icons -- mdi:database@#2b8a3e simple-icons:redis --out docs/assets/icons`;
}

/**
 * Reads a response body with a ceiling, so an oversized or endless reply is cut
 * off instead of buffered. `content-length` is only a hint; the stream is
 * counted either way.
 */
async function readBounded(response, limit, source) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) {
    throw new Error(`${source} is larger than the ${limit} byte limit`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error(`${source} is larger than the ${limit} byte limit`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function get(url) {
  return fetch(url, { redirect: "error", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// Icon sets repeat across a batch; the collection metadata only needs one fetch.
const collections = new Map();

function loadCollection(prefix) {
  if (!collections.has(prefix)) {
    collections.set(
      prefix,
      get(`https://api.iconify.design/collections?prefix=${encodeURIComponent(prefix)}`)
        .then(async (r) =>
          r.ok ? JSON.parse(await readBounded(r, MAX_META_BYTES, "collection metadata")) : null,
        )
        .catch(() => null),
    );
  }
  return collections.get(prefix);
}

function sanitize(svg, source) {
  if (!/^\s*<svg[\s>]/i.test(svg)) throw new Error(`${source} did not return an SVG`);
  if (/<script|\son\w+\s*=|<foreignObject|xlink:href\s*=\s*["']\s*https?:|href\s*=\s*["']\s*https?:/i.test(svg)) {
    throw new Error(`${source} contains active or remote content and was rejected`);
  }
  return svg;
}

function normalize(svg, size) {
  const viewBox = svg.match(/viewBox="([^"]+)"/i);
  let out = svg.replace(/\s(width|height)="[^"]*"/gi, "");
  out = out.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
  if (!viewBox) throw new Error("SVG has no viewBox; refusing to guess its geometry");
  return out;
}

async function main(argv) {
  const icons = [];
  let outDir = "docs/assets/icons";
  let size = 64;
  let force = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return process.stdout.write(`${usage()}\n`);
    if (arg === "--out") outDir = argv[++index];
    else if (arg === "--size") size = Number(argv[++index]);
    else if (arg === "--force") force = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else icons.push(arg);
  }
  if (icons.length === 0) throw new Error("Expected at least one icon id, e.g. mdi:database");
  if (!Number.isFinite(size) || size < 8 || size > 512) throw new Error("size must be 8..512");

  // Creates and canonicalises the directory once; the sentinel name is only a
  // handle for the shared check and is never written.
  const realOutDir = path.dirname(await prepareOutput(path.join(outDir, ".icons"), { force }));
  const rows = [];
  const failures = [];
  for (const entry of icons) {
    const [id, color] = entry.split("@");
    try {
      const match = id.match(/^([a-z0-9-]+):([a-z0-9-]+)$/i);
      if (!match) throw new Error(`icon id must look like "prefix:name"`);
      const [, prefix, name] = match;
      const url = new URL(`https://api.iconify.design/${prefix}/${name}.svg`);
      if (color) url.searchParams.set("color", color);

      const response = await get(url);
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? `no such icon (check the id at https://icon-sets.iconify.design/${prefix}/)`
            : `${url} returned ${response.status}`,
        );
      }
      const body = await readBounded(response, MAX_SVG_BYTES, url.href);
      const svg = normalize(sanitize(body, url.href), size);

      const file = path.join(realOutDir, `${prefix}--${name}.svg`);
      await writeFileNoFollow(file, svg);

      const set = (await loadCollection(prefix))?.[prefix];
      rows.push({
        id,
        file: path.relative(process.cwd(), file) || file,
        url: url.href,
        set: set?.name ?? prefix,
        license: set?.license?.title ?? "check https://icon-sets.iconify.design/",
        author: set?.author?.name ?? "unknown",
      });
    } catch (error) {
      // One bad id should not throw away the icons that did resolve.
      failures.push(`${id}: ${error.message}`);
    }
  }

  process.stdout.write("\n| Icon | File | Set | Author | License | Source |\n");
  process.stdout.write("| --- | --- | --- | --- | --- | --- |\n");
  for (const row of rows) {
    process.stdout.write(
      `| \`${row.id}\` | \`${row.file}\` | ${row.set} | ${row.author} | ${row.license} | ${row.url} |\n`,
    );
  }

  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`failed: ${failure}\n`);
    throw new Error(`${failures.length} of ${icons.length} icons could not be vendored`);
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exitCode = 1;
}
