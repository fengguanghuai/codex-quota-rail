import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {bridgeCommand} from '../src/startup.mjs';
const supported=['darwin','win32'].includes(process.platform);
const app=process.platform==='win32'?'C:\\QuotaTestMissing\\Codex.exe':'/Applications/QuotaTestMissing.app';
test('native snapshot reports absent target without touching another application',{skip:!supported},()=>{
 const [bin,args]=bridgeCommand('snapshot',app);
 const result=JSON.parse(execFileSync(bin,args,{encoding:'utf8',timeout:20000}));
 assert.deepEqual(result.apps,[]);assert(Number.isFinite(result.now));assert(Number.isFinite(result.inputStamp));
});
test('native event observer becomes ready without an idle polling timer',{skip:!supported},async()=>{
 const [bin,args]=bridgeCommand('watch',app);
 const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',d=>errors+=d);
 const lines=createInterface({input:child.stdout});
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('observer timeout '+errors)),20000);
   child.once('error',e=>{clearTimeout(timer);reject(e)});
   child.once('exit',code=>{clearTimeout(timer);reject(new Error('observer exited '+code+' '+errors))});
   lines.once('line',line=>{clearTimeout(timer);try{assert.equal(JSON.parse(line).event,'ready');resolve();}catch(e){reject(e)}});
  });
 }finally{lines.close();child.kill();}
});
