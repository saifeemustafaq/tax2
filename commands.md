echo 'export PATH="/Users/msaifee/.local/bin:$PATH"' >> ~/.zshrc && echo "Added to ~/.zshrc"


msaifee@macos-GC79C3PYFV tax2 % codegen
Usage: codegen [OPTIONS] COMMAND [ARGS]...

  A CLI tool for validation and enrichment tasks.

  This function sets up the CLI group, allowing for the addition of
  multiple commands.

Options:
  --help  Show this message and exit.

Commands:
  enrich      Perform enrichment tasks.
  login       Request and store authentication credentials.
  mcp         Manage MCP (Model Context Protocol) services.
  upgrade     Upgrade the CLI to the latest version.
  validation  Perform validation tasks based on the provided...
  version     Display the current version of the CLI.
msaifee@macos-GC79C3PYFV tax2 % codegen mcp install mcp-synthetic-data:0.2.5
CLI version: 0.74.5 (execution id: f55b2a75)
📥 Installing MCP service: mcp-synthetic-data (version: 0.2.5)

ℹ️ Authentication required. Starting EIAM login...
❌ EIAM login failed: eiamcli not found
Error checking if MCP exists: Failed to obtain authentication 
credentials
ℹ️ Authentication required. Starting EIAM login...
❌ EIAM login failed: eiamcli not found
❌ Error: MCP 'mcp-synthetic-data' not found
msaifee@macos-GC79C3PYFV tax2 % eiam cli
zsh: command not found: eiam
msaifee@macos-GC79C3PYFV tax2 % eiamcli login
zsh: command not found: eiamcli
msaifee@macos-GC79C3PYFV tax2 % brew install eiamcli
✔︎ JSON API formula_tap_migrations.jws.jso Downloaded    1.9KB/  1.9KB
✔︎ JSON API cask_tap_migrations.jws.json   Downloaded    2.4KB/  2.4KB
✔︎ JSON API cask.jws.json                  Downloaded   15.4MB/ 15.4MB
✔︎ JSON API formula.jws.json               Downloaded   32.0MB/ 32.0MB
Warning: No available formula with the name "eiamcli".
==> Searching for similarly named formulae and casks...
Error: No formulae or casks found for eiamcli.
msaifee@macos-GC79C3PYFV tax2 %

msaifee@macos-GC79C3PYFV tax2 % $ curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
zsh: command not found: $
msaifee@macos-GC79C3PYFV tax2 % curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg" 

  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:-- 24 52.6M   24 12.9M    0     0  10.2M      0  0:00:05  0:00:01  0:00 77 52.6M   77 40.6M    0     0  17.9M      0  0:00:02  0:00:02 --:--100 52.6M  100 52.6M    0     0  19.0M      0  0:00:02  0:00:02 --:--:-- 19.0M
msaifee@macos-GC79C3PYFV tax2 % sudo installer -pkg AWSCLIV2.pkg -target /
installer: Package name is AWS Command Line Interface
installer: Installing at base path /
installer: The install was successful.
msaifee@macos-GC79C3PYFV tax2 % 
msaifee@macos-GC79C3PYFV tax2 % which aws
/usr/local/bin/aws
msaifee@macos-GC79C3PYFV tax2 % aws --version
aws-cli/2.34.24 Python/3.14.3 Darwin/24.6.0 exe/arm64
msaifee@macos-GC79C3PYFV tax2 % 

https://artifactory.a.intuit.com/nexus/content/repositories/IBP.Intuit-Releases/com/intuit/ebs/eiam/eiamCli-mac/

then found the latest package: 3.0.9/  of the eiamcli  and then downloaded the zip: https://artifactory.a.intuit.com/nexus/content/repositories/IBP.Intuit-Releases/com/intuit/ebs/eiam/eiamCli-mac/3.0.9/eiamCli-mac-3.0.9.zip

1. cd to "unzipped location" 
2. chmod 750 install.sh
3. ./install.sh
NOTES: 
- Please note that if you see "permission denied" error, run "sudo ./install.sh"

OR

Installation
Note: awscli should be installed first, you can find information that here

For Mac Users:
Please download the latest release (.zip) from this nexus repository and unzip to a location you can remember.

1. cd to "unzipped location" 
2. chmod 750 install.sh
3. ./install.sh
NOTES: 
- Please note that if you see "permission denied" error, run "sudo ./install.sh"
Newer Mac Users may have to go to Security & Privacy in System Preferences by allowing apps downloaded from "App Store and identified developers" as well as allowing eiamCli. You can find instructions here and here

🍺 Brew Installation

If you are transitioning from the traditional install, please uninstall the previous version by performing rm /usr/local/bin/eiamCli first

For Mac users that like to use Brew you can install the latest version of eiamCli using these steps:

brew tap intuit/eiamcli git@github.intuit.com:EIAM/eiamCli-golang.git
brew install eiamCli
or if your git is setup via https:

brew tap intuit/eiamcli https://github.intuit.com/EIAM/eiamCli-golang.git
brew install eiamCli


now:

msaifee@macos-GC79C3PYFV tax2 % eiamcli login

Your browser has been opened to visit:
https://federation.intuit.com/as/user_authz.oauth2?user_code=KG4R-DYKV
Please validate user code is 'KG4R-DYKV', and click 'Confirm' to complete authentication
Waiting for user confirmation...

Authentication successful. You can now use other commands 'iamticket' ,'getAWSTempCredentials', 'getAWSTempSSHCert' without user credentials/MFA for next 10 hours.

msaifee@macos-GC79C3PYFV tax2 % 
msaifee@macos-GC79C3PYFV tax2 % eiamcli login

Your browser has been opened to visit:
https://federation.intuit.com/as/user_authz.oauth2?user_code=KG4R-DYKV
Please validate user code is 'KG4R-DYKV', and click 'Confirm' to complete authentication
Waiting for user confirmation...

Authentication successful. You can now use other commands 'iamticket' ,'getAWSTempCredentials', 'getAWSTempSSHCert' without user credentials/MFA for next 10 hours.

msaifee@macos-GC79C3PYFV tax2 % codegen mcp install mcp-synthetic-data:0.2.5
CLI version: 0.74.5 (execution id: c8ee974d)
📥 Installing MCP service: mcp-synthetic-data (version: 0.2.5)

❌ No container runtime found (Docker or Podman required)
msaifee@macos-GC79C3PYFV tax2 % codegen mcp install mcp-synthetic-data:0.2.5
CLI version: 0.74.5 (execution id: f4e80c4d)
📥 Installing MCP service: mcp-synthetic-data (version: 0.2.5)

❌ Docker is installed but not running
❌ No container runtime found (Docker or Podman required)
msaifee@macos-GC79C3PYFV tax2 % podman machine start
zsh: command not found: podman
msaifee@macos-GC79C3PYFV tax2 % 

msaifee@macos-GC79C3PYFV tax2 % podman machine start
Error: podman-machine-default: VM does not exist
msaifee@macos-GC79C3PYFV tax2 % codegen mcp install mcp-synthetic-data:0.2.5
CLI version: 0.74.5 (execution id: 836c73ca)
📥 Installing MCP service: mcp-synthetic-data (version: 0.2.5)

❌ Docker is installed but not running
✅ Podman runtime is available and running
ℹ️ Verifying container runtime (podman)...
❌ Docker is installed but not running
✅ Podman runtime is available and running
🏷️ Using version 0.2.5 with image 
docker.intuit.com/atlas/mcp-synthetic-data/service/mcp-synthetic-data

Configure Environment Variables:
  Default: INFO
[?] Environment variable 'LOG_LEVEL': INFO

  Default: e2e
[?] Environment variable 'APP_ENV': e2e

[?] Select IDEs to install MCP for: 
 > [X] 🖥️ Cursor
   [X] 🖥️ Qodo (VSCode)
   [X] 🖥️ Qodo (JetBrains)
   [X] 🖥️ Windsurf
   [X] 🖥️ Augment (VSCode)
   [X] 🖥️ Cline
   [X] 📋 Manual Installation

⚠️ JetBrains settings directory not found at 
/Users/msaifee/Library/Application Support/JetBrains
  Updating IDE settings...
  Updating IDE settings...
  Updating IDE settings...
  Updating IDE settings...
  Updating IDE settings...
  Updating IDE settings...

ℹ️ Manual Installation Configurations
Use the following configuration in your IDE's MCP settings:
(Note: Requires Docker or Podman container runtime)
{
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

✅ MCP 'mcp-synthetic-data' successfully installed for 5 IDE(s)
⚠️ Failed to install for: Qodo (JetBrains)
╭────────────────── Next Steps ───────────────────╮
│ Please restart your IDE(s) to apply the changes │
╰─────────────────────────────────────────────────╯
msaifee@macos-GC79C3PYFV tax2 % 