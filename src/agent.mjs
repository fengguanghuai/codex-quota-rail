import { DebugConnection, readQuota } from './rpc.mjs';
import { quotaWindows, language, eligiblePage } from './core.mjs';
import { mountCard } from './card.mjs';
import { port, ownedEndpoint, codexPath, settings, saveSettings, writeStatus, systemLocale } from './platform.mjs';

import { createStartupWatcher } from './startup.mjs';

export async function runAgent() {
  const startup=createStartupWatcher(()=>tick());
  let config = settings(), stopped = false, busy = false, nextRead = 0;
  let state = { weekly: null, session: null, resetCredits: null, resetCreditExpiry: null, extraCredits: null, planType: null, status: 'waiting', updated: null, language: language(config.language, systemLocale()) };
  const connections = new Map();
  const cancellation = new AbortController();
  async function publish() {
    for (const connection of connections.values()) {
      try {
        await connection.evaluate(`(${mountCard.toString()})()`);
        connection.placed = await connection.evaluate(`window.__quotaRailV1?.update(${JSON.stringify(state)})`);
      } catch { connection.close(); }
    }
  }
  async function tick() {
    if (busy || stopped) return; busy = true;
    try {
      let reachable=false;
      try { const probe=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)});reachable=probe.ok; }catch{}
      if (!reachable || !ownedEndpoint()) {
        for (const c of connections.values()) c.close(); connections.clear();
        state = { ...state, weekly: null, session: null, resetCredits: null, resetCreditExpiry: null, extraCredits: null, planType: null, updated: null, status: 'waiting' };
        writeStatus({ state: 'waiting-for-client', attachedWindows: 0, startup: startup.status }); return;
      }
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('discovery-failed');
      const targets = (await response.json()).filter(eligiblePage);
      const ids = new Set(targets.map(t => t.id));
      for (const [id, c] of connections) if (!ids.has(id) || c.closed) { c.close(); connections.delete(id); }
      for (const target of targets) {
        if (connections.has(target.id)) continue;
        const c = await DebugConnection.connect(target.webSocketDebuggerUrl, port);
        try {
          await c.send('Runtime.enable');
          await c.send('Runtime.addBinding', { name: 'quotaRailAction' });
          c.onEvent = message => {
            if (message.method !== 'Runtime.bindingCalled' || message.params?.name !== 'quotaRailAction') return;
            let action; try { action = JSON.parse(message.params.payload); } catch { return; }
            if (action.type === 'language') {
              state.language = state.language === 'zh' ? 'en' : 'zh';
              config = { language: state.language }; saveSettings(config); publish().catch(() => {});
            } else if (action.type === 'refresh') nextRead = 0;
          };
          connections.set(target.id, c);
        } catch { c.close(); }
      }
      await publish();
      if (connections.size && Date.now() >= nextRead) {
        nextRead = Date.now() + 60000;
        try {
          const binary = codexPath(); if (!binary) throw new Error('codex-missing');
          const result = await readQuota(binary, 20000, cancellation.signal);
          state = { ...state, ...quotaWindows(result), status: 'ready', updated: Date.now() };
        } catch { state = { ...state, weekly: null, session: null, resetCredits: null, resetCreditExpiry: null, extraCredits: null, planType: null, status: 'unavailable', updated: null }; }
        await publish();
      }
      writeStatus({ state: state.status, attachedWindows: [...connections.values()].filter(c => c.placed).length, lastSync: state.updated, startup: startup.status });
    } catch { writeStatus({ state: 'connection-unavailable', attachedWindows: 0 }); }
    finally { busy = false; }
  }
  const timer = setInterval(tick, 5000);
  async function stop() {
    if (stopped) return; stopped = true; startup.stop(); clearInterval(timer); cancellation.abort();
    await Promise.allSettled([...connections.values()].map(c => c.evaluate('window.__quotaRailV1?.remove()')));
    for (const c of connections.values()) c.close();
    process.exit(0);
  }
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  startup.start();
  await tick();
}
