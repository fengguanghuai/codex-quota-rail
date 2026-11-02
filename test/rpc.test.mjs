import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';
import { DebugConnection } from '../src/rpc.mjs';
test('CDP correlates replies, evaluates results and tears down pending requests', async () => {
  const server = new WebSocketServer({ port:0, host:'127.0.0.1' });
  await new Promise(r=>server.once('listening',r));
  const port=server.address().port;
  server.on('connection',socket=>socket.on('message',raw=>{
    const m=JSON.parse(raw); if(m.method==='Runtime.evaluate') socket.send(JSON.stringify({id:m.id,result:{result:{value:true}}}));
  }));
  let connection;
  try {
    connection=await DebugConnection.connect(`ws://127.0.0.1:${port}`,port);
    assert.equal(await connection.evaluate('true'),true);
    const pending=connection.send('NeverReply'); connection.close();
    await assert.rejects(pending,/debug-closed/);
  } finally { connection?.close(); for(const c of server.clients)c.terminate(); await new Promise(r=>server.close(r)); }
});

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readQuota } from '../src/rpc.mjs';
function fakeServer(body) {
  const dir=mkdtempSync(path.join(tmpdir(),'quota-rail-test-'));
  const file=path.join(dir,'codex.cjs');
  writeFileSync(file,'#!/usr/bin/env node\n'+body,{mode:0o700});
  return {file,dispose:()=>rmSync(dir,{recursive:true,force:true})};
}
test('quota RPC initializes before querying and returns only the response', async()=>{
  const server=fakeServer(`const rl=require('node:readline').createInterface({input:process.stdin});let ready=false;rl.on('line',s=>{const m=JSON.parse(s);if(m.method==='initialize'){ready=true;console.log(JSON.stringify({id:m.id,result:{}}))}else if(m.method==='account/rateLimits/read'&&ready)console.log(JSON.stringify({id:m.id,result:{rateLimits:{primary:{windowDurationMins:10080,usedPercent:12}}}}));});`);
  try { assert.equal((await readQuota(process.execPath,2000,undefined,[server.file])).rateLimits.primary.usedPercent,12); }
  finally { server.dispose(); }
});
test('quota RPC has a bounded timeout and handles process failures', async()=>{
  const server=fakeServer('setInterval(()=>{},1000);');
  try { await assert.rejects(readQuota(process.execPath,150,undefined,[server.file]),/quota-timeout/); }
  finally { server.dispose(); }
  await assert.rejects(readQuota('/nonexistent/quota-test-binary',500));
});
test('stopping the agent cancels an in-flight quota subprocess', async()=>{
  const server=fakeServer('setInterval(()=>{},1000);');
  const controller=new AbortController();
  try {
    const pending=readQuota(process.execPath,20000,controller.signal,[server.file]);
    controller.abort();
    await assert.rejects(pending,/quota-cancelled/);
  } finally { server.dispose(); }
});
