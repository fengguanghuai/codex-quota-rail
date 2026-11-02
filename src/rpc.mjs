import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { validSocket } from './core.mjs';

export async function readQuota(binary, timeoutMs = 20000, signal, args = ['app-server', '--stdio']) {
  if (signal?.aborted) throw new Error('quota-cancelled');
  const child = spawn(binary, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  return new Promise((resolve, reject) => {
    let done = false;
    const lines = createInterface({ input: child.stdout });
    const timer = setTimeout(() => finish(new Error('quota-timeout')), timeoutMs);
    const onAbort = () => finish(new Error('quota-cancelled'));
    signal?.addEventListener('abort', onAbort, { once: true });
    function finish(error, result) {
      if (done) return; done = true; clearTimeout(timer); lines.close();
      signal?.removeEventListener('abort', onAbort);
      child.stdin.end(); child.kill('SIGTERM');
      const force = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 1500);
      force.unref(); child.once('exit', () => clearTimeout(force));
      error ? reject(error) : resolve(result);
    }
    function send(message) { child.stdin.write(JSON.stringify(message) + '\n', error => { if (error) finish(error); }); }
    child.on('error', error => finish(error));
    child.stdin.on('error', error => finish(error));
    child.on('exit', () => { if (!done) finish(new Error('quota-process-exit')); });
    lines.on('line', line => {
      let message; try { message = JSON.parse(line); } catch { return; }
      if (![1, 2].includes(message.id)) return;
      if (message.error) return finish(new Error('quota-unavailable'));
      if (message.id === 1) {
        send({ method: 'initialized' });
        send({ id: 2, method: 'account/rateLimits/read' });
      } else finish(null, message.result);
    });
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'codex_quota_rail', version: '0.1.0' } } });
  });
}

export class DebugConnection {
  constructor(socket) {
    this.socket = socket; this.sequence = 0; this.pending = new Map(); this.closed = false;
    socket.addEventListener('message', event => {
      let m; try { m = JSON.parse(event.data); } catch { return; }
      const item = this.pending.get(m.id);
      if (item) { this.pending.delete(m.id); clearTimeout(item.timer); m.error ? item.reject(new Error('debug-command-failed')) : item.resolve(m.result); }
      else this.onEvent?.(m);
    });
    socket.addEventListener('close', () => this.close());
    socket.addEventListener('error', () => this.close());
  }
  static async connect(url, port) {
    if (!validSocket(url, port)) throw new Error('non-local-debug-endpoint');
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.close(); reject(new Error('debug-timeout')); }, 4000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('debug-unavailable')); }, { once: true });
    });
    return new DebugConnection(socket);
  }
  send(method, params = {}) {
    if (this.closed) return Promise.reject(new Error('debug-closed'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('debug-timeout')); }, 4000);
      this.pending.set(id, { resolve, reject, timer });
      try { this.socket.send(JSON.stringify({ id, method, params })); }
      catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error('render-failed');
    return r.result?.value;
  }
  close() {
    if (this.closed) return; this.closed = true;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('debug-closed')); }
    this.pending.clear(); this.socket.close();
  }
}
