import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { discoverMacApp } from './macos-paths.mjs';
import { ownsListeners } from './core.mjs';
import { windowsHome, windowsApp, windowsCodex, windowsProcesses, windowsListeners, ownsWindowsListeners } from './windows.mjs';
export const isWindows = process.platform === 'win32';
export const home = isWindows ? windowsHome : path.join(homedir(), 'Library/Application Support/CodexQuotaRail');
export const label = 'io.github.fengguanghuai.codex-quota-rail';
export const plist = path.join(homedir(), 'Library/LaunchAgents', `${label}.plist`);
export const port = 39333;
export function appPath() {
  if(isWindows)return windowsApp();
  return discoverMacApp({explicit:process.env.CODEX_QUOTA_APP,saved:settings().appPath})?.app;
}
export function codexPath() {
  if(isWindows)return windowsCodex(appPath());
  return discoverMacApp({explicit:process.env.CODEX_QUOTA_APP,saved:settings().appPath})?.cli;
}
export function settings() {
  try { const s = JSON.parse(readFileSync(path.join(home, 'settings.json'), 'utf8')); return { language: ['zh','en','auto'].includes(s.language) ? s.language : 'auto', ...(typeof s.appPath==='string'?{appPath:s.appPath}:{}) }; }
  catch { return { language: 'auto' }; }
}
export function saveSettings(value) { mkdirSync(home, { recursive: true, mode: 0o700 }); writeFileSync(path.join(home, 'settings.json'), JSON.stringify({...settings(),...value}), { mode: 0o600 }); }
export function writeStatus(value) { mkdirSync(home, { recursive: true, mode: 0o700 }); writeFileSync(path.join(home, 'status.json'), JSON.stringify({ ...value, checkedAt: Date.now() }), { mode: 0o600 }); }
export function ownedEndpoint() {
  if(isWindows){try{return ownsWindowsListeners(windowsListeners(port),windowsProcesses(),appPath());}catch{return false;}}
  // A localhost port alone is not authentication. Verify the listener is our installed client.
  try {
    const pids = execFileSync('/usr/sbin/lsof', ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: 2000 }).trim().split(/\s+/);
    const expected = appPath();
    const rows = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,comm='], { encoding: 'utf8', timeout: 2000 }).split('\n').flatMap(line => {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
      return m ? [{ pid: m[1], parent: m[2], executable: m[3] }] : [];
    });
    return ownsListeners(pids, rows, expected);
  } catch { return false; }
}
export function systemLocale() {
  if(isWindows)return Intl.DateTimeFormat().resolvedOptions().locale;
  try { return execFileSync('/usr/bin/defaults', ['read','-g','AppleLocale'], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: 2000 }).trim(); }
  catch { return Intl.DateTimeFormat().resolvedOptions().locale; }
}
