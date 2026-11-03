# Codex Quota Rail

**Your weekly allowance and reset time, right above your profile.**

[简体中文](README.zh-CN.md) · [Security](SECURITY.md) · [MIT license](LICENSE)

A small, independently implemented macOS / Windows add-on for the Codex experience in the ChatGPT desktop app. A colored ring above your profile shows weekly allowance. Hover for details; click to pin. Click again, click outside, or press Escape to dismiss.

> **Preview.** Automated DOM/protocol tests and local desktop injection have been checked. Cross-version compatibility remains unverified. This is not an official OpenAI plugin.

## Features

- Ring color changes from green to amber and red as allowance falls.
- Weekly and optional five-hour windows each have a remaining-allowance bar, exact reset time, countdown and elapsed-cycle progress bar.
- Read-only reset credit count and earliest upcoming expiry. No credits shows zero; failed or stale reads show unavailable.
- Credit balance displayed as a whole number (fractional part omitted), without assuming a currency or grant source.
- English and Simplified Chinese, with a persistent language switch.
- Automatic minute refresh and manual refresh. All times use the computer's local time zone.
- Original-icon startup: a newly detected launch may be gracefully reopened once with the required connection arguments. Existing sessions are left alone; no force-kill or client-bundle edits.
- Zero runtime npm dependencies. Development tests use jsdom and ws.

## Requirements

- macOS with ChatGPT.app or Codex.app in `/Applications`, or Windows 10/11 with a compatible Codex desktop client. Windows support is experimental; real-client visual acceptance is pending.
- An existing Codex login and accessible bundled Codex CLI.
- Node.js 22 or later, including Homebrew or nvm installations.
- A compatible navigation rail. The app-server and renderer interfaces are internal and can change.

## Install

Download a release ZIP and extract it, or clone this repository. Double-click **Install.command** on macOS or **Install.cmd** on Windows. No `npm install` is required to run the add-on.

Terminal alternative:

```sh
node src/cli.mjs install
```

On macOS, installation registers a user login LaunchAgent and copies only the runtime files into `~/Library/Application Support/CodexQuotaRail`. The background agent does not open Codex at login. It watches for new launches and may gracefully reopen a fresh launch once to enable the connection.

## Start Codex with the card

After installation, save your work and completely quit the client once, then open **the original Codex icon**. A native event listener receives launch/exit notifications (macOS NSWorkspace; Windows CIM process events). There is no five-second process scan or required waiting period.

A newly launched, foreground client may be gracefully reopened once with local connection arguments, only if launch initialization has finished and no subsequent user input is detected. If you start interacting, the handoff is skipped. Existing sessions at agent startup are never restarted. Attempts are persisted before quitting, have a one-minute cooldown, and never force-kill a client. Only the short startup/quit transition uses bounded checks. Connection health still uses a lightweight local endpoint probe; quota refresh remains once per minute.

On macOS, pointer motion and mouse release alone do not count as new input; key presses, new clicks, scrolling and dragging still prevent handoff. Local `startup-diagnostics.json` records the most recent startup decision for troubleshooting.

If event subscriptions are unavailable, the client refuses graceful close, or the agent started after the client, use **Start Codex.command / Start Codex.cmd** as a fallback after quitting manually. Status reports `startup: listening` or `unavailable`. Windows event subscriptions may be restricted by system policy.

The ZIP includes a universal macOS 14+ native helper and its Swift source; end users do not need Xcode. Developers can rebuild it with `scripts/build-native.sh` and Xcode command-line tools. The helper is ad-hoc signed, not Apple-notarized. Windows uses a bundled PowerShell script with execution policy scoped to the helper process.

Installation does not restart the current client. Event observer and guard tests do not replace signed-in desktop relaunch acceptance; Windows remains experimental.

## macOS application location

The installer checks `/Applications/Codex.app`, `/Applications/ChatGPT.app`, then the corresponding apps in `~/Applications`. A candidate must contain Info.plist and an executable bundled Codex CLI. It does not fall back to an unrelated global CLI.

For a renamed or custom installation, run from the extracted package:

```sh
CODEX_QUOTA_APP="/absolute/path/My Codex.app" node src/cli.mjs install
```

The verified real path is saved locally, so background startup does not depend on that temporary environment variable. If the app is moved later, reinstall with its new path. Invalid explicit or saved paths do not silently select another installation. Status reports the selected app path.

## Windows setup

Install Node.js 22+ with PATH enabled, extract the ZIP, then use the four `.cmd` entry points: Install, Start Codex, Status, Uninstall. No administrator permission is normally needed.

Runtime files are stored in `%LOCALAPPDATA%\CodexQuotaRail`. A `CodexQuotaRail.vbs` entry in the current user's Startup folder launches the background agent hidden at login; it does not launch Codex. Windows Script Host must be enabled. No task or system service is installed.

Standard per-user, Program Files and Microsoft Store locations are detected. For an unrecognized installation, set persistent user environment variables `CODEX_QUOTA_APP` (absolute path to the desktop .exe) and optionally `CODEX_QUOTA_CLI` (absolute path to codex.exe), then reopen the installer. Store-managed clients may restrict direct executable launch or ignore debugging arguments; these builds cannot be guaranteed compatible. Run Status.cmd to check the connection. A compatible navigation rail and the app-server protocol are required.

Windows CI covers PowerShell, listener/process validation and isolated agent start/stop; it does not include a signed-in Codex desktop. macOS visual evidence does not establish Windows UI compatibility.

## Language and status

Use **English / 简体中文** in the detail panel to switch. The choice is saved locally.

```sh
node src/cli.mjs language auto  # or en / zh
node src/cli.mjs status
```

Status reports installation/connection state, attached-window count and sync timestamps; it does not print raw account or credential data. `waiting-for-client` normally means the client needs to be opened using the provided start entry. If connection exists but the attached count remains zero, the client UI may be incompatible; please report the client version, without chat screenshots or account details.

## Uninstall

Double-click **Uninstall.command** (macOS) or **Uninstall.cmd** (Windows), or:

```sh
node src/cli.mjs uninstall
```

This removes this add-on's card when connected, stops its LaunchAgent and removes its owned installation directory. **Fully quit and reopen the desktop client from its original icon afterward to close the debugging port.** The downloaded repository remains yours to keep or delete. Codex itself, its login and its conversations are not deleted.

## How it works

```text
Bundled Codex app-server ── read-only rate-limit RPC ── local agent
                                                         │
                                          localhost CDP connection
                                                         │
                                      card in the navigation rail
```

The agent periodically reads `account/rateLimits/read`, selects windows by duration, and sends only display data to a self-contained card with scoped Shadow DOM styles. It does not read your conversation database or scan projects. DOM changes trigger reattachment; if the profile anchor is absent, the card stays hidden instead of guessing its position.

The CDP connection uses `127.0.0.1:39333`. It has broader capabilities than quota display: **localhost is not authentication**. The add-on checks the listener process and rejects non-loopback WebSocket addresses, but these checks do not prevent other local software from accessing the client debugger. Read [SECURITY.md](SECURITY.md).

## Develop

```sh
npm ci
npm test
```

The tests cover window selection, invalid/stale readings, locale selection, renderer insertion/removal, language controls, reconnect-style DOM replacement and CDP request lifecycle. CI runs on macOS and Windows with Node 22 and 24.

Contributions and compatibility reports are welcome. Please keep changes small and preserve startup-only restart guards. See [CONTRIBUTING.md](CONTRIBUTING.md).

## AI-assisted first installation

Use [codex-quota-setup](skills/codex-quota-setup/SKILL.md) for macOS discovery, first launch and actual UI acceptance. From this repository, install it with `npx skills add . --skill codex-quota-setup -g -a codex`, or ask your agent to read the file directly. Downloading the repository alone does not automatically load the skill in every AI host. Runtime operation does not require an AI session.
