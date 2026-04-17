# MCP Synthetic Data -- Installation Guide

How to install and configure the `mcp-synthetic-data` MCP server for use with Cursor (and other IDEs). The MCP runs inside a Podman container and communicates via STDIO.

## Prerequisites

| Dependency | Purpose |
|---|---|
| Homebrew | Package manager (all other tools installed through it) |
| `uv` | Python package installer for the Codegen CLI |
| AWS CLI v2 | Required by `eiamcli` for credential management |
| `eiamcli` | Intuit EIAM authentication |
| Podman | Container runtime (runs the MCP server) |
| Codegen CLI | Installs and manages the MCP service |

## Step-by-step Installation

### 1. Install uv

```bash
brew install uv
```

### 2. Add `~/.local/bin` to your PATH

This is where `uv` installs CLI tools.

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Install AWS CLI v2

Required before installing `eiamcli`.

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
rm AWSCLIV2.pkg
```

Verify:

```bash
aws --version
```

### 4. Install eiamcli

**Option A -- Homebrew (preferred):**

```bash
brew tap intuit/eiamcli git@github.intuit.com:EIAM/eiamCli-golang.git
brew install eiamCli
```

If your git is set up via HTTPS:

```bash
brew tap intuit/eiamcli https://github.intuit.com/EIAM/eiamCli-golang.git
brew install eiamCli
```

**Option B -- Manual download:**

1. Download the latest `.zip` from the [Nexus repository](https://artifactory.a.intuit.com/nexus/content/repositories/IBP.Intuit-Releases/com/intuit/ebs/eiam/eiamCli-mac/)
2. Unzip and run:

```bash
cd <unzipped-location>
chmod 750 install.sh
./install.sh          # use "sudo ./install.sh" if you get a permission error
```

> **Note (newer Macs):** You may need to allow the binary in System Settings > Privacy & Security.

### 5. Install Podman

```bash
brew install podman
podman machine init
podman machine start
```

Verify:

```bash
podman info
```

> Podman needs its VM running to execute containers. If you restart your Mac, run `podman machine start` again before using the MCP.

### 6. Install the Codegen CLI

```bash
uv tool install platformexps-tools-codegencli-codegencli \
  --index-url https://artifact.intuit.com/artifactory/api/pypi/pypi-intuit/simple
```

Verify:

```bash
codegen version
```

You should see version **0.74.x** or later.

### 7. Authenticate with EIAM

```bash
eiamcli login
```

A browser window will open. Confirm the code and complete authentication. Credentials are valid for 10 hours.

### 8. Install the MCP

```bash
codegen mcp install mcp-synthetic-data:0.2.5
```

The CLI will prompt you for:

- **LOG_LEVEL** -- press Enter to accept the default (`INFO`)
- **APP_ENV** -- press Enter to accept the default (`e2e`)
- **IDE selection** -- select the IDEs you want to configure (Cursor at minimum)

After completion you should see:

```
MCP 'mcp-synthetic-data' successfully installed
```

### 9. Restart Cursor

Restart Cursor to load the new MCP configuration.

## Usage Notes

- The MCP runs inside a Podman container. When you generate a file (e.g. a synthetic document), you will need to instruct the AI to **copy it from the container to your local filesystem**.
- If EIAM credentials expire (after 10 hours), run `eiamcli login` again.
- If Podman's VM is stopped (e.g. after a reboot), run `podman machine start` before using the MCP.

## Resulting Configuration

The installer writes the following to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-synthetic-data": {
      "command": "codegen",
      "args": [
        "mcp",
        "run-docker",
        "mcp-synthetic-data",
        "--version",
        "0.2.5"
      ],
      "env": {}
    }
  }
}
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `codegen: command not found` | Ensure `~/.local/bin` is on your PATH and run `source ~/.zshrc` |
| `eiamcli: command not found` | Re-install eiamcli (see step 4) |
| `No container runtime found` | Run `podman machine start` |
| `EIAM login failed` | Run `eiamcli login` to refresh credentials |
| `VM does not exist` | Run `podman machine init` then `podman machine start` |
