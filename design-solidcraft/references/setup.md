# SolidCraft setup

Give the user only the sections that apply. Fill in the CLI path that worked in preflight and the absolute output folder.

## Contents

- Install SolidCraft
- Enable the MCP server
- Allow the output folder

## Install SolidCraft

`solidcraft-cli` ships with the SolidCraft app. Downloads are at https://solidcraft.io/download, and every package is at https://github.com/tangency-labs/solidcraft/releases/latest.

| System | Install | CLI after install |
|---|---|---|
| Linux (Debian, Ubuntu, Mint) | download the `.deb`, then `sudo apt install ./solidcraft-linux-x86_64.deb` | `solidcraft-cli` on PATH |
| Linux (Fedora, openSUSE) | download the `.rpm`, then `sudo dnf install ./solidcraft-linux-x86_64.rpm` | `solidcraft-cli` on PATH |
| Linux (Snap) | `sudo snap install solidcraft` | `solidcraft.cli` |
| macOS | open the `.dmg` and drag SolidCraft to Applications; the first time, right-click it and choose **Open** (the app is not signed yet) | `/Applications/SolidCraft.app/Contents/MacOS/solidcraft-cli` |
| Windows | `winget install bherbruck.SolidCraft`, or the `.msi` | `C:\Program Files\SolidCraft\solidcraft-cli.exe` (not on PATH) |

ARM64 packages have `aarch64` or `arm64` in the file name. Check the install with `<CLI> --version`. The AppImage, Flatpak, and browser app do not provide a plain CLI command; for those, see https://docs.solidcraft.io/guide/getting-started.html.

## Enable the MCP server

Add the server to the agent client's MCP configuration. Most clients use this shape, for example pi (`~/.pi/agent/mcp.json`), Claude Code (a project `.mcp.json`), Claude Desktop (`claude_desktop_config.json`), and Cursor (`mcp.json`):

```json
{
  "mcpServers": {
    "solidcraft": {
      "command": "solidcraft-cli",
      "args": ["mcp", "--allow-path", "/absolute/path/to/your/designs"]
    }
  }
}
```

- If the CLI is not on PATH, set `command` to its path from the install table. In JSON, escape Windows backslashes: `"C:\\Program Files\\SolidCraft\\solidcraft-cli.exe"`.
- `--allow-path` names a folder the server may read and write. Repeat it for more folders. Without it, the server can write only to its own temporary folder, so saving designs to your project fails.
- If the file already has an `mcpServers` object, add `solidcraft` to it instead of replacing it.
- Restart the client or reload its MCP servers. Then check that the SolidCraft tools (`inspect_design`, `batch`, `measure`, …) are listed and enabled, and run the request again.

This runs the server headless, in its own design session with no window. To watch the agent model in the desktop app instead, see bridged mode in SolidCraft's MCP docs: https://github.com/tangency-labs/solidcraft/blob/main/docs/mcp.md

## Allow the output folder

The server refused a path because it is outside its allowed folders; the error lists them. Either:

- write the design to one of the listed folders, or
- add `"--allow-path", "<absolute output folder>"` to the server's `args`, restart the client, and run the request again.

Hidden folders (names starting with `.`) are reachable only when an `--allow-path` names them or a folder above them. Avoid `--allow-any-path`, which removes every file limit.
