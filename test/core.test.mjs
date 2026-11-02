import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaWindows, language, validSocket, eligiblePage } from '../src/core.mjs';
const week = { windowDurationMins: 10080, usedPercent: 76, resetsAt: 1800000000 };
test('weekly window works in either slot and never confuses a 5h window', () => {
  for (const key of ['primary','secondary']) assert.deepEqual(quotaWindows({ rateLimits: { [key]: week } }).weekly, { remaining: 24, reset: 1800000000000 });
  const q = quotaWindows({ rateLimits: { primary: { ...week, windowDurationMins: 300 }, secondary: week } });
  assert.equal(q.weekly.remaining, 24); assert.equal(q.session.remaining, 24);
});
test('missing, invalid and over-limit data are explicit', () => {
  assert.equal(quotaWindows({}).weekly, null);
  for (const usedPercent of [-1, NaN, Infinity, '20']) assert.equal(quotaWindows({ rateLimits: { primary: { ...week, usedPercent } } }).weekly, null);
  assert.equal(quotaWindows({ rateLimits: { primary: { ...week, usedPercent: 130 } } }).weekly.remaining, 0);
  assert.equal(quotaWindows({ rateLimits: { primary: { ...week, resetsAt: null } } }).weekly.reset, null);
});
test('account-wide codex limits take precedence over other pools', () => {
  assert.equal(quotaWindows({ rateLimits: { primary: { ...week, usedPercent: 1 } }, rateLimitsByLimitId: { codex: { secondary: week } } }).weekly.remaining, 24);
});
test('language is explicit or follows locale', () => {
  assert.equal(language('auto','zh-Hans-CN'),'zh'); assert.equal(language('auto','fr-FR'),'en'); assert.equal(language('en','zh-CN'),'en');
});
test('only local CDP websocket endpoints on our exact port are accepted', () => {
  assert(validSocket('ws://127.0.0.1:39333/devtools/page/1',39333));
  for (const url of ['ws://evil.test:39333/x','ws://127.0.0.1:39222/x','wss://localhost:39333/x','ws://user:pass@localhost:39333/x','bad']) assert.equal(validSocket(url,39333),false);
});
test('browser sites and devtools are not eligible renderer targets', () => {
  assert(eligiblePage({ type:'page',url:'app://-/index.html' }));
  for (const target of [{type:'page',url:'https://example.com'}, {type:'worker',url:'app://-/index.html'}, {type:'page',url:'devtools://devtools/bundled/inspector.html'}]) assert.equal(eligiblePage(target),false);
});

import { ownsListeners } from '../src/core.mjs';
test('client helpers may inherit the socket but unrelated holders are rejected', () => {
  const rows=[{pid:'1',parent:'0',executable:'/Applications/ChatGPT.app/Contents/MacOS/ChatGPT'}, {pid:'2',parent:'1',executable:'/helper'}, {pid:'3',parent:'9',executable:'/other'}];
  assert(ownsListeners(['1','2'],rows,'/Applications/ChatGPT.app'));
  assert(!ownsListeners(['1','3'],rows,'/Applications/ChatGPT.app'));
  assert(!ownsListeners(['2'],rows,'/Applications/ChatGPT.app'));
});
test('reset credits preserve zero and reject missing or invalid counts', () => {
  for(const count of [0,3]) assert.equal(quotaWindows({rateLimitResetCredits:{availableCount:count}}).resetCredits,count);
  for(const count of [undefined,null,-1,1.5,'3']) assert.equal(quotaWindows({rateLimitResetCredits:{availableCount:count}}).resetCredits,null);
});
test('next credit expiry uses only available Codex credits and absent credits mean zero', () => {
  const now=100000, credit={resetType:'codexRateLimits',status:'available',expiresAt:300};
  const result={rateLimitResetCredits:{availableCount:3,credits:[credit,{...credit,expiresAt:200},{...credit,expiresAt:150,status:'used'},{...credit,expiresAt:50},{...credit,expiresAt:120,resetType:'other'}]}};
  assert.equal(quotaWindows(result,now).resetCreditExpiry,200000);
  assert.equal(quotaWindows({}).resetCredits,0);
  assert.equal(quotaWindows({rateLimitResetCredits:{availableCount:0,credits:[credit]}},now).resetCreditExpiry,null);
});
test('extra balance truncates fractions, distinguishes unlimited, zero and unknown', () => {
  const read=credits=>quotaWindows({rateLimits:{credits}}).extraCredits;
  assert.deepEqual(read({balance:'57994.8417840000'}),{unlimited:false,balance:57994});
  assert.deepEqual(read({unlimited:true}),{unlimited:true,balance:null});
  assert.deepEqual(read({hasCredits:false}),{unlimited:false,balance:0});
  for(const balance of ['',null,-1,'bad',Infinity]) assert.equal(read({balance}),null);
});
test('plan type preserves server identifiers and treats missing values as unknown',()=>{
  assert.equal(quotaWindows({rateLimits:{planType:'prolite'}}).planType,'prolite');
  for(const planType of [null,3,' '])assert.equal(quotaWindows({rateLimits:{planType}}).planType,null);
});
