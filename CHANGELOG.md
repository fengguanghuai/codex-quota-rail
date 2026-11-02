# Changelog

## 0.3.2 — Preview

- Discover macOS apps in system/user Applications or CODEX_QUOTA_APP.
- Validate bundled executable CLI and persist canonical application path.
- Preserve the selected path across language changes; report it in status.

## 0.3.1 — Preview

- Replace startup process polling with NSWorkspace / Windows CIM event listeners.
- Require foreground, finished launch and no new user input before graceful handoff.
- Ship universal macOS bridge with build source; test both native event adapters in CI.

## 0.3.0 — Preview

- Watch original-icon launches and gracefully reopen fresh clients with local connection arguments.
- Preserve existing sessions, reject late/ambiguous launches, persist attempts and enforce cooldown.
- Keep manual launcher as fallback; real-client restart acceptance remains pending.

## 0.2.1 — Preview

- Display consumer plan names instead of internal identifiers. Unknown plan identifiers are hidden.
- Place plan name below the title and keep pin hint on one line.

## 0.2.0 — Preview

- Experimental Windows installer, launcher, login startup and uninstall.
- Windows/macOS CI and user-provided visual preview in both READMEs.

- Integer-only credit balance with unavailable and unlimited states.

- Colored compact ring with hover details and click-to-pin interaction.
- Independent weekly/five-hour reset timelines and countdowns.
- Available reset credit count and nearest upcoming expiry.
- Hide routine sync status; retain unavailable-state feedback.
- Accept verified client descendants inheriting the debug socket.
- Wait for the background job to stop before reinstalling.

## 0.1.0 — Preview

- Inline weekly remaining quota and reset date/time above the profile footer.
- English / Simplified Chinese with a persistent language switch.
- Freshness, expiry and unavailable-state handling.
- Optional five-hour summary when the account returns that window.
- Explicit launcher, login background agent, install/uninstall commands.
- Local quota RPC, scoped card styles, DOM and CDP automated tests.
- Real-client visual and restart acceptance remains pending.
