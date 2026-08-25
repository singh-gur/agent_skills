/**
 * Output writes that cannot be redirected by a symbolic link left in the
 * workspace.
 *
 * `O_NOFOLLOW` refuses a link at the final path component inside the open
 * itself, so there is no window between checking and writing. Parent
 * directories are checked separately, after `mkdir`, against the directory the
 * command was run from. `--force` is the escape hatch for the case the skill
 * genuinely supports: a human naming a destination elsewhere.
 */

import fs from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";

// Not defined on Windows; the parent-directory check carries the weight there.
const NOFOLLOW = FS.O_NOFOLLOW ?? 0;

export async function prepareOutput(file, { force = false, root = process.cwd() } = {}) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const realDir = await fs.realpath(dir);
  const resolved = path.join(realDir, path.basename(file));

  if (!force) {
    const realRoot = await fs.realpath(root);
    if (realDir !== realRoot && !realDir.startsWith(realRoot + path.sep)) {
      throw new Error(
        `Refusing to write outside ${realRoot}: ${resolved}\n` +
          "Pass --force if that destination is intended.",
      );
    }
  }

  // Fail here rather than after a render. `O_NOFOLLOW` below is still the
  // control: this check only makes the common case cheap to report.
  const existing = await fs.lstat(resolved).catch(() => null);
  if (existing?.isSymbolicLink()) {
    throw new Error(`Refusing to write through a symbolic link: ${resolved}`);
  }
  return resolved;
}

export async function writeFileNoFollow(file, data) {
  let handle;
  try {
    handle = await fs.open(file, FS.O_WRONLY | FS.O_CREAT | FS.O_TRUNC | NOFOLLOW, 0o644);
  } catch (error) {
    if (error.code === "ELOOP") {
      throw new Error(`Refusing to write through a symbolic link: ${file}`);
    }
    throw error;
  }
  try {
    await handle.writeFile(data);
  } finally {
    await handle.close();
  }
}
