# Security and privacy / 安全与隐私

This is an unofficial preview add-on, not an OpenAI product. It is not a security audit or a guarantee of compatibility.

## Data access

- Reads rate-limit information through the existing bundled Codex app-server over stdio. The Codex process may use its ordinary authenticated network connections.
- Does not directly read or copy authentication files, ask for API keys, scan projects, read conversation databases, or upload telemetry.
- Stores language preferences and a small status file (state, attached-window count, timestamps). Startup diagnostics additionally store event times, decision reasons, process IDs and launch/input timing; they contain no account or conversation data. Raw RPC account data is not saved.
- Connects to the local desktop renderer using Chrome DevTools Protocol. The injected card reads navigation structure and the profile anchor, not chat messages.

## Debugging interface

The launcher enables port **39333** on loopback. CDP can execute JavaScript within the desktop client and is therefore more powerful than this add-on needs for display. Localhost binding is **not** authentication. Other local processes may reach it. Do not forward this port, expose it to a network, or assume listener ownership checks fully isolate the endpoint.

The agent verifies the listener executable matches the locally installed app before discovery, rejects remote or unexpected WebSocket URLs, and restricts candidate targets to local application/file pages. These are defense-in-depth measures, not a substitute for authentication.

## Changes to your computer

On macOS, install writes this add-on's user Application Support directory and a user LaunchAgent. On Windows it writes %LOCALAPPDATA%/CodexQuotaRail and CodexQuotaRail.vbs in the current user's Startup folder. Windows stop/uninstall terminates only the matching installed agent process tree; it does not terminate the desktop client. It does not patch or re-sign the client, change Dock shortcuts, disable macOS protections, or force-kill your client. A newly observed client launch may receive one graceful quit and reopen request to enable local debugging. Existing sessions at agent startup are skipped, attempts are recorded before quitting and a cooldown prevents restart loops. The manual launcher remains a fallback.

Uninstall stops the owned background service and removes its files. It attempts to remove the live card. Quit and reopen the client normally afterward to close the debugging endpoint. If the renderer connection is unavailable, remaining injected UI disappears when that renderer exits.

## Reporting

Please use GitHub private vulnerability reporting if available. Do not post tokens, cookies, raw quota responses, account identifiers, chat contents or unredacted screenshots in public issues. Report reproducible steps and affected versions only.

## 中文摘要

这是非官方预览扩展，不修改客户端安装包，不直接读取或复制凭据，不扫描项目或会话数据库，无遥测上传。额度通过已有 Codex 服务读取，本机服务可能使用正常登录状态联网。

CDP 调试端口具备在客户端执行 JavaScript 的能力；本机监听并不等于认证。不要转发或暴露端口。安装本身不会重启当前客户端；后台助手可对刚观察到的新启动执行一次正常退出并重开，记录尝试并限制频率，不强制结束客户端；卸载后需完全退出并从原图标重新打开，以关闭调试连接。请勿公开账户数据、凭据或聊天截图。
