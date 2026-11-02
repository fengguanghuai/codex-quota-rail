// Serialized into the client renderer; this component has no external dependencies.
export function mountCard() {
  const key = '__quotaRailV1', version = 10;
  if (window[key]?.version === version) return true;
  window[key]?.remove();
  const host = document.createElement('div'); host.id = 'codex-quota-rail';
  host.style.cssText = 'flex:none;align-self:center;margin:4px 0 8px;-webkit-app-region:no-drag';
  const portal = document.createElement('div'); portal.id = 'codex-quota-rail-details';
  const shadow = host.attachShadow({mode:'open'}), detail = portal.attachShadow({mode:'open'});
  const css = `<style>
    :host{font-family:inherit;color:var(--qr-text,#171717);font-variant-numeric:tabular-nums;-webkit-app-region:no-drag}
    *{box-sizing:border-box}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:2px solid var(--qr-ring,#21866c);outline-offset:3px}
    [hidden]{display:none!important}
    .trigger{display:flex;align-items:center;flex-direction:column;gap:3px;width:44px;padding:5px 3px;border:0;border-radius:10px;background:transparent;line-height:1}
    .trigger:hover,.trigger[aria-expanded=true]{background:var(--qr-hover,#00000006)}
    .meter{position:relative;width:34px;height:34px;display:grid;place-items:center}
    .ring{position:absolute;inset:0;width:34px;height:34px;transform:rotate(-90deg)}
    .ring circle{fill:none;stroke-width:3;stroke-linecap:round}
    .track{stroke:var(--qr-track,#00000012)}.arc{stroke:var(--qr-ring,#21866c);transition:stroke-dashoffset .35s ease,stroke .35s ease}
    .value{font-size:10px;font-weight:600;letter-spacing:-.5px;line-height:14px}
    .label{font-size:10px;line-height:14px;color:var(--qr-secondary,#737373)}
    .panel{position:fixed;z-index:2147483000;width:288px;max-width:calc(100vw - 20px);padding:16px;border:1px solid var(--qr-border,#00000012);border-radius:14px;background:var(--qr-surface,#fff);box-shadow:0 6px 24px #00000014,0 1px 3px #00000008;outline:none;font-size:12px;line-height:1.5}
    header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .heading{font-size:13px;font-weight:600;letter-spacing:-.15px}.plan-name{font-size:11px;font-weight:400;color:var(--qr-secondary);margin-top:3px;line-height:16px}.mode{white-space:nowrap;flex-shrink:0;font-size:10px;color:var(--qr-secondary,#737373)}
    .metrics{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.metrics.dual{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
    .metric-title{font-size:11px;color:var(--qr-secondary,#737373)}
    .amount{font-size:28px;font-weight:500;letter-spacing:-1.1px;line-height:1.2;margin:5px 0 9px;color:var(--metric-color,var(--qr-text))}.amount small{font-size:13px;margin-left:2px;letter-spacing:0}
    progress{display:block;width:100%;height:3px;border:none;border-radius:2px;overflow:hidden;background:var(--qr-track);accent-color:var(--metric-color)}
    progress::-webkit-progress-bar{background:var(--qr-track);border-radius:2px}progress::-webkit-progress-value{background:var(--metric-color);border-radius:2px}
    .reset{margin-top:9px;font-size:11px;line-height:1.65;color:var(--qr-secondary)}.reset strong{display:block;font-weight:400;color:var(--qr-text);white-space:nowrap}
    .time-progress{margin-top:7px;--metric-color:var(--qr-secondary)}.countdown{font-size:10px;color:var(--qr-secondary);margin-top:5px}.credits{display:flex;justify-content:space-between;margin-top:15px;font-size:11px}.credits strong{font-weight:500}
    .freshness{margin-top:15px;font-size:10px;line-height:1.5;color:var(--qr-secondary)}
    footer{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--qr-border);padding-top:9px;margin-top:11px}
    .actions{display:flex;gap:2px}.action{border:0;background:transparent;padding:4px 6px;border-radius:5px;font-size:11px;color:var(--qr-secondary)}.action:hover{background:var(--qr-hover);color:var(--qr-text)}
    @media(prefers-reduced-motion:reduce){.arc{transition:none}}
  </style>`;
  shadow.innerHTML = `${css}<button class="trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="codex-quota-rail-details"><span class="meter"><svg class="ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="track" cx="20" cy="20" r="17"/><circle class="arc" cx="20" cy="20" r="17" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg><span class="value">—</span></span><span class="label"></span></button>`;
  function metric(name) { return `<section class="metric ${name}"><div class="metric-title"></div><div class="amount">—</div><progress max="100" value="0"></progress><div class="reset"><span></span><strong>—</strong></div><progress class="time-progress" max="100" value="0"></progress><div class="countdown"></div></section>`; }
  detail.innerHTML = `${css}<section class="panel" role="dialog" aria-modal="false" tabindex="-1" hidden><header><div><span class="heading"></span><div class="plan-name"></div></div><span class="mode"></span></header><div class="metrics">${metric('weekly')}${metric('session')}</div><div class="credits"><span></span><strong></strong></div><div class="credit-expiry countdown" hidden></div><div class="credits extra-credits"><span></span><strong></strong></div><div class="freshness"></div><footer><div class="actions"><button class="action refresh" type="button"></button><button class="action language" type="button"></button></div><button class="action close" type="button"></button></footer></section>`;
  const trigger = shadow.querySelector('.trigger'), panel = detail.querySelector('.panel');
  let data={language:'en',status:'waiting',weekly:null,session:null,updated:null};
  let pinned=false, disposed=false, queued=false, hoverTimer, closeTimer, rail=null, dark=false;
  const say=(zh,en)=>data.language==='zh'?zh:en;
  const $=selector=>detail.querySelector(selector);
  function color(percent) {
    const stops=[[0,4],[15,18],[35,42],[65,145],[100,160]];
    const p=Math.max(0,Math.min(100,percent));
    const index=stops.findIndex(s=>s[0]>=p);
    const [x1,y1]=stops[Math.max(0,index-1)], [x2,y2]=stops[Math.max(0,index)];
    const hue=x2===x1?y2:y1+(y2-y1)*(p-x1)/(x2-x1);
    return `hsl(${Math.round(hue)} 62% ${dark?62:39}%)`;
  }
  function valid(w) { return data.status==='ready' && w && Number.isFinite(w.remaining) && data.updated && Date.now()-data.updated<180000 && (!w.reset || w.reset>Date.now()); }
  function syncTheme() {
    const source=rail||document.documentElement, s=getComputedStyle(source);
    const root=document.documentElement;
    dark=root.classList.contains('dark')||root.dataset.theme==='dark'||(!root.classList.contains('light')&&root.dataset.theme!=='light'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const values={text:s.getPropertyValue('--color-text-primary').trim()||(dark?'#ededed':'#171717'),secondary:s.getPropertyValue('--color-text-secondary').trim()||(dark?'#a0a0a0':'#737373'),surface:s.getPropertyValue('--color-surface-elevated-secondary').trim()||(dark?'#272727':'#fff'),track:dark?'#ffffff1c':'#00000013',border:dark?'#ffffff16':'#00000012',hover:dark?'#ffffff0b':'#00000006'};
    for(const el of [host,portal]) { el.style.fontFamily=s.fontFamily; for(const [k,v]of Object.entries(values))el.style.setProperty(`--qr-${k}`,v); }
  }
  function render() {
    syncTheme();
    const ready=valid(data.weekly), w=data.weekly;
    host.style.setProperty('--qr-ring',ready?color(w.remaining):'var(--qr-secondary)');
    shadow.querySelector('.value').textContent=ready?`${w.remaining}%`:'—';
    shadow.querySelector('.label').textContent=say('周额度','Weekly');
    const arc=shadow.querySelector('.arc');arc.style.strokeDashoffset=String(100-(ready?w.remaining:0));arc.style.opacity=ready&&w.remaining>0?'1':'0';
    trigger.setAttribute('aria-label',ready?say(`周额度剩余 ${w.remaining}%，查看详情`,`Weekly allowance ${w.remaining}% remaining. View details`):say('额度暂不可用，查看详情','Usage unavailable. View details'));
    trigger.setAttribute('aria-expanded',String(!panel.hidden));
    $('.heading').textContent=say('用量额度','Usage limits');panel.setAttribute('aria-label',say('用量额度详情','Usage limit details'));
    $('.mode').textContent=pinned?say('已固定','Pinned'):say('点击圆环固定','Click ring to pin');
    $('.metrics').classList.toggle('dual',!!data.session);
    for(const name of ['weekly','session']) {
      const metric=$(`.${name}`), item=data[name], available=valid(item);
      metric.hidden=name==='session'&&!item;
      metric.style.setProperty('--metric-color',available?color(item.remaining):'var(--qr-secondary)');
      metric.querySelector('.metric-title').textContent=name==='weekly'?say('每周剩余','Weekly remaining'):say('5 小时剩余','5-hour remaining');
      const amount=metric.querySelector('.amount');amount.replaceChildren(document.createTextNode(available?String(item.remaining):'—'));
      if(available){const small=document.createElement('small');small.textContent='%';amount.append(small);}
      const progress=metric.querySelector('progress');progress.value=available?item.remaining:0;progress.setAttribute('aria-label',metric.querySelector('.metric-title').textContent);
      metric.querySelector('.reset span').textContent=say('重置时间','Resets');
      metric.querySelector('.reset strong').textContent=available&&item.reset?new Intl.DateTimeFormat(data.language==='zh'?'zh-CN':'en-GB',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(item.reset)):'—';
      const timed=data.status==='ready'&&data.updated&&Date.now()-data.updated<180000&&Number.isFinite(item?.reset);
      const duration=(name==='weekly'?10080:300)*60000, left=timed?Math.max(0,item.reset-Date.now()):0;
      const timeProgress=metric.querySelector('.time-progress');
      timeProgress.hidden=!timed;timeProgress.value=timed?Math.max(0,Math.min(100,100*(1-left/duration))):0;
      timeProgress.setAttribute('aria-label',say('重置周期已过去','Reset cycle elapsed'));
      const mins=Math.ceil(left/60000),days=Math.floor(mins/1440),hours=Math.floor(mins%1440/60),minutes=mins%60;
      const countdown=days?say(`${days}天 ${hours}小时`,`${days}d ${hours}h`):hours?say(`${hours}小时 ${minutes}分钟`,`${hours}h ${minutes}m`):say(`${minutes}分钟`,`${minutes}m`);
      metric.querySelector('.countdown').textContent=!timed?'':left===0?say('等待重置同步','Awaiting reset sync'):say(`距重置 ${countdown}`,`Resets in ${countdown}`);

    }
    const creditsFresh=data.status==='ready'&&data.updated&&Date.now()-data.updated<180000;
    $('.credits span').textContent=say('可用重置卡','Reset credits');
    $('.credits strong').textContent=creditsFresh&&Number.isSafeInteger(data.resetCredits)&&data.resetCredits>=0?say(`${data.resetCredits} 次`,`${data.resetCredits} available`):say('暂不可用','Unavailable');
    const expiry=data.resetCreditExpiry;
    $('.credit-expiry').hidden=!(creditsFresh&&data.resetCredits>0&&Number.isFinite(expiry)&&expiry>Date.now());
    $('.credit-expiry').textContent=$('.credit-expiry').hidden?'':say('最近到期 · ','Next expiry · ')+new Intl.DateTimeFormat(data.language==='zh'?'zh-CN':'en-GB',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(expiry));
    $('.extra-credits span').textContent=say('额外点数余额','Credit balance');
    const extra=data.extraCredits;
    $('.extra-credits strong').textContent=!creditsFresh||!extra?say('暂不可用','Unavailable'):extra.unlimited?say('不限额','Unlimited'):Number.isFinite(extra.balance)&&extra.balance>=0?new Intl.NumberFormat(data.language==='zh'?'zh-CN':'en-US',{maximumFractionDigits:0}).format(Math.floor(extra.balance)):say('暂不可用','Unavailable');
    const plans={free:'ChatGPT Free',go:'ChatGPT Go',plus:'ChatGPT Plus',prolite:'ChatGPT Pro 100',pro:'ChatGPT Pro 200',promax:'ChatGPT Pro 500',team:'ChatGPT Team',business:'ChatGPT Business',enterprise:'ChatGPT Enterprise',edu:'ChatGPT Edu'};
    const plan=creditsFresh&&data.planType&&Object.hasOwn(plans,data.planType)?plans[data.planType]:null;
    $('.plan-name').textContent=plan||'';
    $('.plan-name').hidden=!plan;
    $('.freshness').hidden=!!ready;
    $('.freshness').textContent=ready?say('自动同步 · 本地时间','Auto-sync · Local time'):say('暂未同步，请刷新或检查登录状态','Not synced. Refresh or check sign-in.');
    $('.freshness').title=ready?`${new Date(data.updated).toLocaleString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`:'';
    $('.refresh').textContent=say('刷新','Refresh');$('.language').textContent=say('English','简体中文');$('.close').textContent=say('关闭','Close');
    if(!panel.hidden)position();
  }
  function position() {
    const r=trigger.getBoundingClientRect(), p=panel.getBoundingClientRect();
    panel.style.left=`${Math.max(10,Math.min(r.right+10,innerWidth-p.width-10))}px`;
    panel.style.top=`${Math.max(10,Math.min(r.bottom-p.height,innerHeight-p.height-10))}px`;
  }
  function show() {clearTimeout(closeTimer);if(disposed||!host.isConnected||document.hidden)return;panel.hidden=false;render();}
  function hide() {clearTimeout(hoverTimer);clearTimeout(closeTimer);pinned=false;panel.hidden=true;trigger.setAttribute('aria-expanded','false');}
  function deferHide() {clearTimeout(hoverTimer);if(!pinned)closeTimer=setTimeout(hide,180);}
  function enter() {clearTimeout(closeTimer);clearTimeout(hoverTimer);hoverTimer=setTimeout(show,240);}
  trigger.addEventListener('mouseenter',enter);trigger.addEventListener('mouseleave',deferHide);
  panel.addEventListener('mouseenter',()=>clearTimeout(closeTimer));panel.addEventListener('mouseleave',deferHide);
  trigger.addEventListener('focus',show);
  trigger.addEventListener('click',()=>{clearTimeout(hoverTimer);if(pinned){hide();return;}pinned=true;show();});
  function action(type){if(typeof window.quotaRailAction==='function')window.quotaRailAction(JSON.stringify({type}));}
  $('.refresh').onclick=()=>action('refresh');$('.language').onclick=()=>action('language');$('.close').onclick=hide;
  function outside(event){if(!event.composedPath().includes(host)&&!event.composedPath().includes(portal))hide();}
  function escape(event){if(event.key==='Escape')hide();}
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);
  document.addEventListener('visibilitychange',hide);window.addEventListener('resize',position);
  function attach(){
    queued=false;if(disposed)return;
    rail=Array.from(document.querySelectorAll('nav[data-app-navigation-rail]')).find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>200;});
    const profile=rail&&Array.from(rail.querySelectorAll('[aria-label],button')).find(e=>/open profile menu|个人资料|个人信息/i.test(e.getAttribute('aria-label')||e.textContent||''));
    if(!profile){host.remove();hide();return;}
    let footer=profile;while(footer.parentElement&&footer.parentElement!==rail)footer=footer.parentElement;
    if(footer.parentElement!==rail){host.remove();hide();return;}
    if(!portal.isConnected)document.body.append(portal);
    if(host.parentElement!==rail||host.nextElementSibling!==footer)footer.before(host);
  }
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(attach);}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const timer=setInterval(render,1000);
  window[key]={version,update(next){data=next;attach();render();return host.isConnected;},remove(){disposed=true;observer.disconnect();clearInterval(timer);hide();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true);document.removeEventListener('visibilitychange',hide);window.removeEventListener('resize',position);host.remove();portal.remove();delete window[key];}};
  attach();render();return host.isConnected;
}
