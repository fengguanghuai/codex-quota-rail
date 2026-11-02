import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createInterface} from 'node:readline';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {home,appPath,isWindows,port} from './platform.mjs';
import net from 'node:net';
const execute=promisify(execFile);
const native=path.join(path.dirname(fileURLToPath(import.meta.url)),'../native');
export function bridgeCommand(action,app,...args){
 return isWindows?['powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(native,'startup-windows.ps1'),action,app,...args.map(String)]]
 :[path.join(native,'startup-bridge'),[action,app,...args.map(String)]];
}
export class StartupGuard{
 constructor(lastAttempt=0){this.baselined=false;this.seen=new Set();this.lastAttempt=lastAttempt;this.pending=false;}
 consider(snapshot){
  this.pending=false;
  const {apps,now,inputStamp}=snapshot;
  if(!this.baselined){this.baselined=true;for(const a of apps)this.seen.add(a.id);return null;}
  const fresh=apps.filter(a=>!this.seen.has(a.id));
  if(apps.length!==1||fresh.length!==1){for(const a of apps)this.seen.add(a.id);return null;}
  const a=fresh[0];
  const untouched=Number.isFinite(inputStamp)&&inputStamp<=now-a.age*1000+100;
  if(a.argumentsKnown&& !a.debug &&a.age>=0&&a.age<=8&&untouched&&(!a.finished||!a.frontmost)){
   this.pending=true;return null;
  }
  this.seen.add(a.id);
  if(this.seen.size>256)this.seen=new Set(apps.map(a=>a.id));
  if(!a.argumentsKnown||a.debug||!a.finished||!a.frontmost||!untouched||a.age<0||a.age>8||now-this.lastAttempt<60000)return null;
  this.lastAttempt=now;return {...a,inputStamp};
 }
}
function occupied(){
 return new Promise(resolve=>{
  const s=net.createConnection({host:'127.0.0.1',port});let done=false;
  const finish=v=>{if(done)return;done=true;s.destroy();resolve(v);};
  s.once('connect',()=>finish(true));s.once('error',e=>finish(e.code!=='ECONNREFUSED'));s.setTimeout(500,()=>finish(true));
 });
}
export function createStartupWatcher(onChange=()=>{}){
 const receipt=path.join(home,'startup-receipt.json');
 let last=0;try{last=JSON.parse(readFileSync(receipt,'utf8')).attemptedAt||0;}catch{}
 const guard=new StartupGuard(last),abort=new AbortController();
 let observer,stopped=false,busy=false,queued=false,timer,status='not-started';
 const app=appPath();
 async function call(action,...args){
  const [bin,argv]=bridgeCommand(action,app,...args);
  const r=await execute(bin,argv,{encoding:'utf8',windowsHide:true,timeout:15000,signal:abort.signal});
  return JSON.parse(r.stdout);
 }
 async function handle(){
  const candidate=guard.consider(await call('snapshot'));
  if(!candidate)return;
  if(await occupied()||stopped)return;
  const temp=receipt+'.tmp';
  writeFileSync(temp,JSON.stringify({attemptedAt:Date.now()}),{mode:0o600});renameSync(temp,receipt);
  const quit=await call('quit',candidate.id,candidate.inputStamp);
  if(!quit.accepted)return;
  const deadline=Date.now()+10000;
  while(!stopped&&Date.now()<deadline){
   await new Promise(r=>setTimeout(r,250));if(stopped)return;
   const snapshot=await call('snapshot');
   if(snapshot.apps.some(a=>a.id!==candidate.id))return;
   if(!snapshot.apps.length){if(!stopped)await call('launch',candidate.inputStamp);return;}
  }
 }
 async function pump(){
  queued=true;if(busy||stopped)return;busy=true;clearTimeout(timer);
  try{while(queued&&!stopped){queued=false;await handle();status='listening';onChange();}}
  catch{guard.pending=false;status='unavailable';}
  finally{busy=false;if(guard.pending&&!stopped)timer=setTimeout(pump,250);}
 }
 return {
  get status(){return status;},
  start(){
   if(observer||stopped||!app)return;
   const [bin,argv]=bridgeCommand('watch',app);
   observer=spawn(bin,argv,{stdio:['ignore','pipe','ignore'],windowsHide:true});
   const lines=createInterface({input:observer.stdout});
   lines.on('line',line=>{try{const m=JSON.parse(line);if(['ready','changed'].includes(m.event))pump();}catch{}});
   observer.once('error',()=>{status='unavailable';});observer.once('exit',()=>{clearTimeout(timer);guard.pending=false;if(!stopped)status='unavailable';});
  },
  stop(){stopped=true;clearTimeout(timer);abort.abort();observer?.kill();}
 };
}
