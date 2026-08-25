import fs from "node:fs/promises";
import path from "node:path";

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
  --help            Show this help

Example:
  npm run icons -- mdi:database@#2b8a3e simple-icons:redis --out docs/assets/icons`;
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
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return process.stdout.write(`${usage()}\n`);
    if (arg === "--out") outDir = argv[++index];
    else if (arg === "--size") size = Number(argv[++index]);
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else icons.push(arg);
  }
  if (icons.length === 0) throw new Error("Expected at least one icon id, e.g. mdi:database");
  if (!Number.isFinite(size) || size < 8 || size > 512) throw new Error("size must be 8..512");

  await fs.mkdir(outDir, { recursive: true });
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

      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? `no such icon (check the id at https://icon-sets.iconify.design/${prefix}/)`
            : `${url} returned ${response.status}`,
        );
      }
      const svg = normalize(sanitize(await response.text(), url.href), size);

      const file = path.join(outDir, `${prefix}--${name}.svg`);
      await fs.writeFile(file, svg);

      const meta = await fetch(`https://api.iconify.design/collections?prefix=${prefix}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const set = meta?.[prefix];
      rows.push({
        id,
        file,
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
