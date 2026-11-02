import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

export const windowsHome = path.join(process.env.LOCALAPPDATA || path.join(homedir(),'AppData','Local'), 'CodexQuotaRail');
export const startupFile = path.join(process.env.APPDATA || path.join(homedir(),'AppData','Roaming'), 'Microsoft','Windows','Start Menu','Programs','Startup','CodexQuotaRail.vbs');
export function psQuote(value) { return "'" + value.replaceAll("'", "''") + "'"; }
export function powershell(script) {
  return execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], { encoding:'utf8', windowsHide:true, timeout:15000, stdio:['ignore','pipe','pipe'] }).trim();
}
function json(script) { const value=powershell(script); return value?JSON.parse(value):[]; }
export function windowsApp() {
  const explicit=process.env.CODEX_QUOTA_APP;
  if(explicit) return path.isAbsolute(explicit)&&/\.exe$/i.test(explicit)&&existsSync(explicit)?explicit:undefined;
  const roots=[process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Programs'),process.env.LOCALAPPDATA,process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean);
  for(const root of roots)for(const name of ['Codex','ChatGPT']) {
    const exe=path.join(root,name,`${name}.exe`);if(existsSync(exe))return exe;
  }
  try {
    const packages=json("@(Get-AppxPackage | Where-Object { $_.Name -match 'OpenAI|ChatGPT|Codex' } | Select-Object -ExpandProperty InstallLocation) | ConvertTo-Json -Compress");
    for(const root of [packages].flat())for(const name of ['Codex.exe','ChatGPT.exe','app/Codex.exe','app/ChatGPT.exe']) {
      const exe=path.join(root,name);if(existsSync(exe))return exe;
    }
  }catch{}
}
export function windowsCodex(app) {
  if(process.env.CODEX_QUOTA_CLI) return path.isAbsolute(process.env.CODEX_QUOTA_CLI)&&/\.exe$/i.test(process.env.CODEX_QUOTA_CLI)&&existsSync(process.env.CODEX_QUOTA_CLI)?process.env.CODEX_QUOTA_CLI:undefined;
  if(!app)return;
  const roots=[path.join(path.dirname(app),'resources'),path.join(path.dirname(app),'Resources')];
  function find(dir,depth){
    if(depth<0)return;
    let entries;try{entries=readdirSync(dir,{withFileTypes:true});}catch{return;}
    for(const e of entries)if(e.isFile()&&e.name.toLowerCase()==='codex.exe')return path.join(dir,e.name);
    for(const e of entries)if(e.isDirectory()){const result=find(path.join(dir,e.name),depth-1);if(result)return result;}
  }
  for(const root of roots){const found=find(root,5);if(found)return found;}
}
export function windowsProcesses() {
  return [json('Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,ExecutablePath | ConvertTo-Json -Compress')].flat().filter(Boolean).map(r=>({pid:String(r.ProcessId),parent:String(r.ParentProcessId),executable:r.ExecutablePath||''}));
}
export function windowsListeners(port) {
  return [json(`@(Get-NetTCPConnection -State Listen -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) | ConvertTo-Json -Compress`)].flat().filter(Boolean).map(String);
}
export function ownsWindowsListeners(pids,rows,app) {
  if(!app||!pids.length)return false;
  const normalize=s=>path.win32.normalize(s).toLowerCase();
  const byId=new Map(rows.map(r=>[r.pid,r]));
  return pids.every(pid=>{
    const seen=new Set();
    while(pid&&!seen.has(pid)){
      const row=byId.get(pid);if(!row)return false;
      if(normalize(row.executable)===normalize(app))return true;
      seen.add(pid);pid=row.parent;
    }
    return false;
  });
}
export async function stopWindowsAgent(home) {
  const script=path.join(home,'src','cli.mjs');
  // Match an exact entry point and agent argument, never all node.exe processes.
  powershell(`$entry=[regex]::Escape(${psQuote(script)}); $pattern='(?i)(?:^|\\s)"?'+$entry+'"?\\s+agent(?:\\s|$)'; $targets=@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq ${psQuote(process.execPath)} -and $_.CommandLine -match $pattern }); foreach($item in $targets){ & taskkill.exe /PID $item.ProcessId /T /F | Out-Null; if($LASTEXITCODE -ne 0 -and (Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue)){throw 'Unable to stop quota agent'} }`);

}
export function startWindowsAgent(home) {
  const child=spawn(process.execPath,[path.join(home,'src','cli.mjs'),'agent'],{detached:true,stdio:'ignore',windowsHide:true});child.unref();
}
export function registerWindowsAgent(home) {
  mkdirSync(path.dirname(startupFile),{recursive:true});
  const command=`"${process.execPath}" "${path.join(home,'src','cli.mjs')}" agent`;
  writeFileSync(startupFile,`Set shell = CreateObject("WScript.Shell")\r\nshell.Run "${command.replaceAll('"','""')}", 0, False\r\n`);
}
export function unregisterWindowsAgent(){rmSync(startupFile,{force:true});}
export function launchWindowsApp(app,debug,port){
  const child=spawn(app,debug?['--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`]:[],{detached:true,stdio:'ignore'});child.unref();
}
