import test from 'node:test';
import assert from 'node:assert/strict';
import { ownsWindowsListeners, psQuote, powershell, windowsProcesses, windowsListeners } from '../src/windows.mjs';
test('Windows socket validation accepts only the exact client or its descendants',()=>{
  const app='C:\\Users\\Test\\Codex\\Codex.exe';
  const rows=[{pid:'10',parent:'1',executable:app.toUpperCase()},{pid:'11',parent:'10',executable:'C:\\helper.exe'},{pid:'12',parent:'1',executable:'C:\\other\\Codex.exe'},{pid:'13',parent:'13',executable:''}];
  assert(ownsWindowsListeners(['10','11'],rows,app));
  for(const pids of [[],['12'],['10','12'],['13'],['999']])assert(!ownsWindowsListeners(pids,rows,app));
  assert.equal(psQuote("C:\\O'Brien\\node.exe"),"'C:\\O''Brien\\node.exe'");
});
test('Windows PowerShell and process inspection run on the actual OS', {skip:process.platform!=='win32'},()=>{
  assert.equal(powershell("'quota rail'"),'quota rail');
  assert(windowsProcesses().some(r=>r.pid===String(process.pid)));
  assert(Array.isArray(windowsListeners(39333)));
});

import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {startWindowsAgent,stopWindowsAgent} from '../src/windows.mjs';
test('Windows agent lifecycle handles paths with spaces and stops only its own process', {skip:process.platform!=='win32'},async()=>{
  const home=mkdtempSync(path.join(tmpdir(),'quota agent '));
  try{
    mkdirSync(path.join(home,'src'));
    writeFileSync(path.join(home,'src','cli.mjs'),'setInterval(()=>{},1000);');
    startWindowsAgent(home);
    await new Promise(r=>setTimeout(r,600));
    const script=path.join(home,'src','cli.mjs');
    const count=()=>Number(powershell(`@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains(${psQuote(script)}) }).Count`));
    assert.equal(count(),1);
    await stopWindowsAgent(home);
    assert.equal(count(),0);
    assert(windowsProcesses().some(r=>r.pid===String(process.pid)));
  }finally{await stopWindowsAgent(home);rmSync(home,{recursive:true,force:true});}
});

import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
test('Windows install, status and uninstall use only isolated user directories', {skip:process.platform!=='win32'},()=>{
  const temp=mkdtempSync(path.join(tmpdir(),'quota install '));
  const env={...process.env,LOCALAPPDATA:path.join(temp,'local'),APPDATA:path.join(temp,'roaming'),CODEX_QUOTA_APP:process.execPath,CODEX_QUOTA_CLI:process.execPath};
  const entry=fileURLToPath(new URL('../src/cli.mjs',import.meta.url));
  const run=command=>execFileSync(process.execPath,[entry,command],{env,encoding:'utf8',timeout:60000});
  let installed=false;
  try{
    run('install');installed=true;
    assert.equal(JSON.parse(run('status')).installed,true);
    const startup=path.join(env.APPDATA,'Microsoft','Windows','Start Menu','Programs','Startup','CodexQuotaRail.vbs');
    assert(existsSync(startup));
    run('uninstall');installed=false;
    assert(!existsSync(startup));assert(!existsSync(path.join(env.LOCALAPPDATA,'CodexQuotaRail')));
  }finally{if(installed)run('uninstall');rmSync(temp,{recursive:true,force:true});}
});
