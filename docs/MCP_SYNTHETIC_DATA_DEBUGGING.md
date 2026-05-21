# MCP Synthetic Data Server — Debugging Report

**Date:** April 6, 2026
**Machine:** macOS (Apple Silicon / arm64)
**Container Runtime:** Podman 5.8.1 (Docker is NOT installed)

---

## Summary

The `mcp-synthetic-data` MCP server configured in Cursor fails to start. The root cause is a compatibility gap between the `codegen` CLI (which expects Docker) and the local environment (which uses Podman). Several secondary issues compound the problem.

---

## MCP Server Configuration

**File:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "mcp-synthetic-data": {
      "command": "/Users/msaifee/.local/bin/codegen",
      "env": {},
      "args": [
        "mcp",
        "run-docker",
        "mcp-synthetic-data",
        "--version",
        "0.2.5"
      ]
    }
  }
}
```

**Image:** `docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5`

---

## Issue 1: `docker` binary not found

### Symptom

```
[error] error: could not lock config file /Users/msaifee/.gitconfig: File exists
[error] Client error for command Unexpected token 'A', "An error o"... is not valid JSON
[warning] [V1] initializing -> error: Unexpected token 'A', "An error o"... is not valid JSON
[warning] Pending server creation failed: MCP error -32001: Request timed out
```

### Root Cause

The `codegen mcp run-docker` command internally invokes `docker`. This machine only has Podman installed — there was no `docker` binary in `$PATH`.

When `codegen` failed, it printed a **plain-text error message** to stdout (starting with `"An error o..."`). Cursor's MCP client expects **JSON-RPC** on stdout, so it could not parse the response, resulting in the `Unexpected token 'A'` JSON parse error. After 60 seconds with no valid handshake, Cursor timed out.

The `.gitconfig` lock error is a side effect — `codegen` attempts to configure git (possibly for container registry auth) and encounters a transient lock file conflict.

### Fix Applied

Created a symlink so `codegen` can find a "docker" command (Podman is CLI-compatible):

```bash
sudo ln -s /Users/msaifee/.homebrew/bin/podman /usr/local/bin/docker
```

### Result

The JSON parse and `.gitconfig` lock errors stopped. However, the server still did not connect (see Issue 2).

---

## Issue 2: Stale containers preventing startup

### Symptom

After applying the Docker symlink fix, the error changed to:

```
[info] Starting new stdio process with command: /Users/msaifee/.local/bin/codegen mcp run-docker mcp-synthetic-data --version 0.2.5
[warning] [V1] initializing -> error: Client closed
```

The `codegen` command runs but produces **zero output** on stdout and hangs indefinitely.

### Root Cause

There were **9+ orphaned containers** from previous failed startup attempts, all still running:

```
CONTAINER ID  IMAGE                                                                         STATUS      NAMES
037bf47cee6d  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-delam3s0
a38bdc4b0da2  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-knhhup2r
7bbf1fed7ab5  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-rbgdqh70
7ac9c84e03a6  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-okk3tvby
5badcbb10eac  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-yxcfhdxh
e9f0ffd3d1d5  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-pumkocdb
a685e0145e29  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-gxv408m4
e0fa023140be  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-ve6diao9
30a111a1fd56  docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5   Up 3 days   mcp-synthetic-data-7f97jir4
```

These likely cause port conflicts or confuse the `codegen` CLI, making it hang silently.

### Fix Required

Remove all stale containers before retrying:

```bash
podman rm -f $(podman ps -aq)
```

> **Note:** This command was attempted but timed out (took longer than 30 seconds for 9 containers). It may need to be run manually in a terminal and given time to complete. If individual removal is needed:

```bash
podman rm -f mcp-synthetic-data-delam3s0
podman rm -f mcp-synthetic-data-knhhup2r
podman rm -f mcp-synthetic-data-rbgdqh70
# ... repeat for each container
```

After cleanup, verify with:

```bash
podman ps -a
```

Then retry the MCP server from Cursor's settings.

---

## Issue 3 (Potential): `codegen` CLI incompatibility with Podman

### Concern

Even with the `docker` symlink and stale containers cleaned up, there is no guarantee the `codegen mcp run-docker` command is fully compatible with Podman. Known differences between Docker and Podman that could cause problems:

- **Docker socket path:** `codegen` may look for `/var/run/docker.sock`. Podman uses a different socket (typically `$XDG_RUNTIME_DIR/podman/podman.sock` or via `podman machine`). If `codegen` communicates via the Docker API socket rather than the CLI, the symlink alone won't help.
- **`--latest` flag:** Podman does not support `docker ps --latest`, which `codegen` may use internally.
- **Networking:** Podman on macOS runs containers inside a VM (`podman machine`). Port mapping behavior can differ from Docker Desktop.

### Diagnostic Commands

```bash
# Check if codegen uses the Docker socket
DOCKER_HOST=unix:///$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}') \
  codegen mcp run-docker mcp-synthetic-data --version 0.2.5

# Check Podman socket path
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# Verify the symlink works for basic commands
docker --version   # Should show "podman version 5.8.1"
docker ps          # Should show Podman containers
```

---

## Environment Details

| Item | Value |
|------|-------|
| OS | macOS (darwin arm64) |
| Podman | 5.8.1 (`/Users/msaifee/.homebrew/bin/podman`) |
| Docker | Not installed (symlink to Podman at `/usr/local/bin/docker`) |
| codegen CLI | `/Users/msaifee/.local/bin/codegen` |
| Podman machine | `podman-machine-default` (Running) |
| MCP image | `docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data:0.2.5` |
| Git config | `/Users/msaifee/.gitconfig` (user: Mustafa Saifee) |

---

## Recommended Steps for Developer

1. **Clean up all stale containers:**
   ```bash
   podman rm -f $(podman ps -aq)
   ```

2. **Verify the Docker symlink works:**
   ```bash
   docker ps
   docker --version
   ```

3. **Test the codegen command manually in a terminal:**
   ```bash
   /Users/msaifee/.local/bin/codegen mcp run-docker mcp-synthetic-data --version 0.2.5
   ```
   Watch for any error output. If it hangs with no output, the issue is likely socket/API level (not CLI level).

4. **If step 3 hangs, try setting DOCKER_HOST:**
   ```bash
   export DOCKER_HOST=unix:///$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')
   /Users/msaifee/.local/bin/codegen mcp run-docker mcp-synthetic-data --version 0.2.5
   ```

5. **If codegen is fundamentally incompatible with Podman**, consider:
   - Installing Docker Desktop alongside Podman
   - Asking the `codegen` / MCP synthetic data team for Podman support
   - Running the container manually with Podman and configuring the MCP server to connect via SSE/HTTP instead of stdio

6. **Retry the MCP server in Cursor** after the above steps succeed.
