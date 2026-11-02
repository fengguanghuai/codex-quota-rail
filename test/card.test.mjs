import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountCard } from '../src/card.mjs';
function fixture() {
  const dom = new JSDOM('<!doctype html><nav data-app-navigation-rail><div id="nav">Navigation</div><div id="footer"><button aria-label="Open profile menu">Avatar</button></div></nav>', { runScripts:'outside-only', pretendToBeVisual:true });
  dom.window.document.querySelector('nav').getBoundingClientRect = () => ({width:52,height:1000});
  dom.window.eval(`(${mountCard.toString()})()`);
  return dom;
}
test('card occupies its own slot above profile, updates, and removes cleanly', () => {
  const dom = fixture();
  try {
    const w = dom.window, doc = w.document, host = doc.getElementById('codex-quota-rail');
    assert.equal(host.nextElementSibling.id,'footer');
    w.eval(`(${mountCard.toString()})()`); assert.equal(doc.querySelectorAll('#codex-quota-rail').length,1);
    const data = {weekly:{remaining:24,reset:Date.now()+86400000},session:null,status:'ready',updated:Date.now(),language:'zh'};
    w.__quotaRailV1.update(data);
    assert.equal(host.shadowRoot.querySelector('.label').textContent,'周额度');
    assert.equal(host.shadowRoot.querySelector('.value').textContent,'24%');
    assert.notEqual(doc.getElementById('codex-quota-rail-details').shadowRoot.querySelector('.weekly .reset strong').textContent,'—');
    w.__quotaRailV1.update({...data,language:'en'});
    assert.equal(host.shadowRoot.querySelector('.label').textContent,'Weekly');
    w.__quotaRailV1.remove(); assert.equal(doc.getElementById('codex-quota-rail'),null); assert(doc.getElementById('footer')); assert.equal(w.__quotaRailV1,undefined);
  } finally { dom.window.__quotaRailV1?.remove(); dom.window.close(); }
});
test('stale, failed and expired data never display a misleading live percentage', () => {
  const dom = fixture();
  try {
    const w=dom.window, value=()=>w.document.getElementById('codex-quota-rail').shadowRoot.querySelector('.value').textContent;
    const base={weekly:{remaining:50,reset:Date.now()+3600000},status:'ready',updated:Date.now(),language:'en'};
    for(const next of [{...base,updated:Date.now()-200000},{...base,status:'unavailable'},{...base,weekly:{remaining:50,reset:Date.now()-1}}]) { w.__quotaRailV1.update(next); assert.equal(value(),'—'); }
  } finally { dom.window.__quotaRailV1?.remove(); dom.window.close(); }
});
test('missing profile means no misplaced card; navigation replacement recovers', async () => {
  const dom=fixture();
  try {
    const w=dom.window, footer=w.document.getElementById('footer'); footer.remove();
    await new Promise(r=>setTimeout(r,0)); assert.equal(w.document.getElementById('codex-quota-rail'),null);
    w.document.querySelector('nav').append(footer);
    await new Promise(r=>setTimeout(r,0)); assert.equal(w.document.getElementById('codex-quota-rail').nextElementSibling,footer);
  } finally { dom.window.__quotaRailV1?.remove(); dom.window.close(); }
});
test('language and refresh buttons use bounded action messages', () => {
  const dom=fixture();
  try {
    const actions=[]; dom.window.quotaRailAction=s=>actions.push(JSON.parse(s));
    const shadow=dom.window.document.getElementById('codex-quota-rail-details').shadowRoot;
    shadow.querySelector('.language').click(); shadow.querySelector('.refresh').click();
    assert.deepEqual(actions,[{type:'language'},{type:'refresh'}]);
  } finally { dom.window.__quotaRailV1?.remove(); dom.window.close(); }
});

test('hover opens, entering detail preserves it, click pins, Escape and outside close', async () => {
  const dom=fixture();
  try {
    const w=dom.window, trigger=w.document.getElementById('codex-quota-rail').shadowRoot.querySelector('button');
    const panel=w.document.getElementById('codex-quota-rail-details').shadowRoot.querySelector('.panel');
    assert(panel.hidden);
    trigger.dispatchEvent(new w.MouseEvent('mouseenter'));
    await new Promise(r=>setTimeout(r,270));assert(!panel.hidden);
    trigger.dispatchEvent(new w.MouseEvent('mouseleave'));panel.dispatchEvent(new w.MouseEvent('mouseenter'));
    await new Promise(r=>setTimeout(r,210));assert(!panel.hidden);
    trigger.click();panel.dispatchEvent(new w.MouseEvent('mouseleave'));
    await new Promise(r=>setTimeout(r,210));assert(!panel.hidden);
    assert.equal(trigger.getAttribute('aria-expanded'),'true');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert(panel.hidden);
    trigger.click();assert(!panel.hidden);
    w.document.body.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));assert(panel.hidden);
    trigger.click();trigger.click();assert(panel.hidden);
  } finally { dom.window.__quotaRailV1?.remove();dom.window.close(); }
});
test('ring color changes with remaining allowance and becomes neutral when stale', () => {
 const dom=fixture();
 try {
  const w=dom.window,host=w.document.getElementById('codex-quota-rail');
  const colors=[];
  for(const remaining of [90,45,20,5]){
   w.__quotaRailV1.update({weekly:{remaining,reset:Date.now()+100000},status:'ready',updated:Date.now(),language:'en'});
   colors.push(host.style.getPropertyValue('--qr-ring'));
   assert.equal(host.shadowRoot.querySelector('.arc').style.strokeDashoffset,String(100-remaining));
  }
  assert.equal(new Set(colors).size,4);
  w.__quotaRailV1.update({weekly:null,status:'unavailable',language:'en'});
  assert.equal(host.style.getPropertyValue('--qr-ring'),'var(--qr-secondary)');
 }finally{dom.window.__quotaRailV1?.remove();dom.window.close();}
});
test('weekly and five-hour reset timelines are independent; credits are read-only', () => {
  const dom=fixture();
  try {
    const w=dom.window, now=Date.now(); w.Date.now=()=>now;
    const state={weekly:{remaining:20,reset:now+3.5*86400000},session:{remaining:80,reset:now+3600000},resetCredits:3,status:'ready',updated:now,language:'zh'};
    w.__quotaRailV1.update(state);
    const d=w.document.getElementById('codex-quota-rail-details').shadowRoot;
    assert.equal(d.querySelector('.weekly .time-progress').value,50);
    assert.equal(d.querySelector('.session .time-progress').value,80);
    assert.equal(d.querySelector('.session').hidden,false);
    assert.match(d.querySelector('.session .countdown').textContent,/1小时/);
    assert.equal(d.querySelector('.credits strong').textContent,'3 次');
    w.__quotaRailV1.update({...state,resetCredits:0});
    assert.equal(d.querySelector('.credits strong').textContent,'0 次');
    w.__quotaRailV1.update({...state,session:null,resetCredits:null});
    assert.equal(d.querySelector('.session').hidden,true);
    assert.equal(d.querySelector('.credits strong').textContent,'暂不可用');
    w.__quotaRailV1.update({...state,weekly:{remaining:20,reset:now-1},status:'ready'});
    assert.equal(d.querySelector('.weekly .time-progress').value,100);
    assert.match(d.querySelector('.weekly .countdown').textContent,/等待重置同步/);
    w.__quotaRailV1.update({...state,updated:now-200000});
    assert.equal(d.querySelector('.weekly .time-progress').hidden,true);
    assert.equal(d.querySelector('.credits strong').textContent,'暂不可用');
  } finally {dom.window.__quotaRailV1?.remove();dom.window.close();}
});
test('extra balance displays integers only and hides stale values', () => {
  const dom=fixture();
  try {
    const w=dom.window,d=w.document.getElementById('codex-quota-rail-details').shadowRoot;
    const data={status:'ready',updated:Date.now(),language:'zh',extraCredits:{balance:57994.84,unlimited:false}};
    w.__quotaRailV1.update(data);
    assert.equal(d.querySelector('.extra-credits strong').textContent,'57,994');
    w.__quotaRailV1.update({...data,updated:Date.now()-200000});
    assert.equal(d.querySelector('.extra-credits strong').textContent,'暂不可用');
  } finally {dom.window.__quotaRailV1?.remove();dom.window.close();}
});
test('plan label is bilingual and unknown plan names are rendered as text',()=>{
  const dom=fixture();
  try{
    const w=dom.window,d=w.document.getElementById('codex-quota-rail-details').shadowRoot;
    const state={status:'ready',updated:Date.now(),language:'zh',planType:'prolite'};
    w.__quotaRailV1.update(state);
    assert.equal(d.querySelector('.plan'),null);
    assert.equal(d.querySelector('.plan-name').textContent,'ChatGPT Pro 100');
    w.__quotaRailV1.update({...state,language:'en',planType:'plus'});
    assert.equal(d.querySelector('.plan-name').textContent,'ChatGPT Plus');
    w.__quotaRailV1.update({...state,status:'unavailable'});
    assert.equal(d.querySelector('.heading').textContent,'用量额度');
    assert(d.querySelector('.plan-name').hidden);
  }finally{dom.window.__quotaRailV1?.remove();dom.window.close();}
});
