import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { home, label, plist, isWindows, appPath, port, ownedEndpoint, settings, saveSettings } from './platform.mjs';
import { DebugConnection } from './rpc.mjs';
import { eligiblePage } from './core.mjs';

import { stopWindowsAgent, startWindowsAgent, registerWindowsAgent, unregisterWindowsAgent, launchWindowsApp, windowsProcesses, windowsListeners } from './windows.mjs';

const command = process.argv[2];
const domain = isWindows ? null : `gui/${process.getuid()}`;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const marker = path.join(home, '.owner');
function run(bin, args) { return execFileSync(bin, args, { stdio: ['ignore','pipe','pipe'], encoding: 'utf8', timeout: 10000 }); }
async function unload() {
  if(isWindows)return stopWindowsAgent(home);
  try { run('/bin/launchctl', ['bootout', `${domain}/${label}`]); } catch {}
  for(let i=0;i<40;i++){
    try { run('/bin/launchctl', ['print', `${domain}/${label}`]); } catch { return; }
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Background agent is still stopping. Please retry. / 后台助手仍在停止，请重试。');
}
function xml(s) { return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function owned() { return existsSync(marker) && readFileSync(marker, 'utf8') === label; }
async function removeCards() {
  if (!ownedEndpoint()) return;
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) });
  for (const t of (await response.json()).filter(eligiblePage)) {
    let c;
    try { c = await DebugConnection.connect(t.webSocketDebuggerUrl, port); await c.evaluate('window.__quotaRailV1?.remove()'); }
    finally { c?.close(); }
  }
}
async function main() {
  if (!['darwin','win32'].includes(process.platform)) throw new Error('This release requires macOS or Windows. / 此版本需要 macOS 或 Windows。');
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ required. / 需要 Node.js 22 或以上。');
  if (command === 'agent') return (await import('./agent.mjs')).runAgent();
  if (command === 'install') {
    const selectedApp=appPath();
    if (!selectedApp) throw new Error('No valid client with a bundled CLI found. Set CODEX_QUOTA_APP to its absolute .app path. / 未找到带内置 CLI 的有效客户端，请用 CODEX_QUOTA_APP 指定 .app 绝对路径。');
    if (existsSync(home) && !owned()) throw new Error('Install directory is not owned by this project. / 安装目录不属于本项目，已停止。');
    if (path.resolve(root) === path.resolve(home)) throw new Error('Run install from the downloaded package. / 请从下载目录运行安装。');
    await unload(); mkdirSync(home, { recursive: true, mode: 0o700 });
    writeFileSync(marker, label, { mode: 0o600 });
    cpSync(path.join(root, 'src'), path.join(home, 'src'), { recursive: true });
    cpSync(path.join(root, 'native'), path.join(home, 'native'), { recursive: true });
    for (const file of ['package.json','LICENSE']) cpSync(path.join(root, file), path.join(home, file));
    saveSettings({...settings(),...(!isWindows?{appPath:selectedApp}:{})});
    if(isWindows){ registerWindowsAgent(home); startWindowsAgent(home); } else {
    mkdirSync(path.dirname(plist), { recursive: true });
    writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(path.join(home,'src/cli.mjs'))}</string><string>agent</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>ThrottleInterval</key><integer>15</integer></dict></plist>`, { mode: 0o600 });
    run('/bin/launchctl', ['bootstrap', domain, plist]);
    }
    if(ownedEndpoint()){console.log('Updated; the component will reconnect automatically. / 已更新，组件会自动重新连接。');return;}
    console.log('Installed. Save your work, quit Codex, then open its original icon.\n已安装。请保存工作并完全退出 Codex，然后点击原来的 Codex 图标。\nNo client was restarted. / 安装没有重启客户端。');
  } else if (command === 'start') {
    if (!owned()) throw new Error('Install first. / 请先安装。');
    const app = appPath(); if (!app) throw new Error('Client missing. / 找不到客户端。');
    if (ownedEndpoint()) { if(!isWindows)run('/usr/bin/open', ['-a', app]); return; }
    const running = isWindows ? windowsProcesses().some(r=>r.executable.toLowerCase()===app.toLowerCase()) : run('/bin/ps', ['-axo','comm=']).split('\n').some(line => line.trim().startsWith(`${app}/Contents/MacOS/`));
    if (running) throw new Error('Codex is running without the connection. Save your work and quit it completely, then start again here.\nCodex 正在运行，请保存工作并完全退出，然后再次运行此启动入口。');
    // Do not launch against an occupied port, even if the listener is not ours.
    let occupied = false;
    try { occupied = isWindows ? windowsListeners(port).length>0 : !!run('/usr/sbin/lsof', ['-nP','-t',`-iTCP:${port}`,'-sTCP:LISTEN']).trim(); } catch {}
    if (occupied) throw new Error('Connection port is occupied. / 连接端口已被占用。');
    if(isWindows)launchWindowsApp(app,true,port);else run('/usr/bin/open', ['-a', app, '--args', '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`]);
    console.log('Codex opened. The card will appear when its sidebar is ready.\n已启动 Codex，侧栏加载后会自动显示卡片。');
  } else if (command === 'uninstall') {
    if (!owned()) throw new Error('No owned installation found; nothing removed. / 未找到本项目安装，未删除任何内容。');
    await removeCards().catch(() => {}); await unload();
    if(isWindows)unregisterWindowsAgent();else if (existsSync(plist)) rmSync(plist);
    rmSync(home, { recursive: true });
    console.log('Uninstalled. Quit and reopen Codex normally to close its debugging port.\n已卸载。请完全退出并从原图标重开 Codex，以关闭本次运行的调试端口。');
  } else if (command === 'status') {
    let status = {}; try { status = JSON.parse(readFileSync(path.join(home,'status.json'),'utf8')); } catch {}
    console.log(JSON.stringify({ installed: owned(), connectionAvailable: ownedEndpoint(), appPath: appPath() ?? null, ...status }, null, 2));
  } else if (command === 'language') {
    const value = process.argv[3]; if (!['zh','en','auto'].includes(value)) throw new Error('Use zh, en or auto.');
    if (!owned()) throw new Error('Install first. / 请先安装。');
    saveSettings({ language: value }); if(isWindows){await unload();startWindowsAgent(home);}else run('/bin/launchctl', ['kickstart','-k',`${domain}/${label}`]);
  } else console.log('Codex Quota Rail: install | start | status | language zh/en/auto | uninstall');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
