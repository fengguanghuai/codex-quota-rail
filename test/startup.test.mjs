import test from 'node:test';
import assert from 'node:assert/strict';
import {StartupGuard,bridgeCommand} from '../src/startup.mjs';
const app={id:'1',pid:1,age:2,debug:false,argumentsKnown:true,finished:true,frontmost:true};
const snapshot=(apps,now=100000,inputStamp=97000)=>({apps,now,inputStamp});
test('baseline protects existing sessions, events detect fast reopen without empty polling sample',()=>{
 const g=new StartupGuard();
 assert.equal(g.consider(snapshot([app])),null);
 assert.equal(g.consider(snapshot([{...app,id:'2'}])).id,'2');
});
test('user input, background, unknown arguments and old processes prevent restart',()=>{
 for(const changes of [{debug:true},{argumentsKnown:false},{age:20}]){
  const g=new StartupGuard();g.consider(snapshot([]));
  assert.equal(g.consider(snapshot([{...app,...changes}])),null);assert(!g.pending);
 }
 const g=new StartupGuard();g.consider(snapshot([]));
 assert.equal(g.consider(snapshot([app],100000,99000)),null);assert(!g.pending);
 assert.equal(g.consider(snapshot([app])),null);
});
test('unfinished/background launch is retried briefly but input cancels it permanently',()=>{
 const g=new StartupGuard();g.consider(snapshot([]));
 assert.equal(g.consider(snapshot([{...app,finished:false,frontmost:false}])),null);assert(g.pending);
 assert.equal(g.consider(snapshot([app],100000,99000)),null);assert(!g.pending);
 assert.equal(g.consider(snapshot([app])),null);
});
test('eligible launch has cooldown and is attempted only once',()=>{
 const g=new StartupGuard();g.consider(snapshot([]));
 assert.equal(g.consider(snapshot([app])).id,'1');
 assert.equal(g.consider(snapshot([app])),null);
 assert.equal(g.consider(snapshot([{...app,id:'2'}])),null);
 const restored=new StartupGuard(99000);restored.consider(snapshot([]));
 assert.equal(restored.consider(snapshot([app])),null);
});
test('native invocation keeps paths and identity as separate arguments',()=>{
 const [bin,args]=bridgeCommand('quit','C:\\App Name\\Codex.exe','pid:key',123);
 assert(bin);assert(args.includes('C:\\App Name\\Codex.exe'));assert(args.includes('pid:key'));assert(args.includes('123'));
});
