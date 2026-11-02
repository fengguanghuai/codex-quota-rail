export function quotaWindows(result, now = Date.now()) {
  const limits = result?.rateLimitsByLimitId?.codex ?? result?.rateLimits;
  const windows = ['primary', 'secondary'].map(key => limits?.[key]).filter(Boolean);
  function take(minutes) {
    const w = windows.find(w => w.windowDurationMins === minutes);
    if (!w || typeof w.usedPercent !== 'number' || !Number.isFinite(w.usedPercent) || w.usedPercent < 0) return null;
    return {
      remaining: Math.round(Math.max(0, Math.min(100, 100 - w.usedPercent))),
      reset: typeof w.resetsAt === 'number' && Number.isFinite(w.resetsAt) && w.resetsAt > 0 ? w.resetsAt * 1000 : null,
    };
  }
  const credits = limits?.credits;
  const rawBalance = credits?.balance;
  const numericBalance = typeof rawBalance === 'number' || (typeof rawBalance === 'string' && /^\d+(\.\d+)?$/.test(rawBalance)) ? Number(rawBalance) : NaN;
  const extraCredits = credits?.unlimited === true ? { unlimited: true, balance: null }
    : Number.isFinite(numericBalance) && numericBalance >= 0 ? { unlimited: false, balance: Math.floor(numericBalance) }
    : credits?.hasCredits === false ? { unlimited: false, balance: 0 } : null;
  const reset = result?.rateLimitResetCredits;
  const count = reset?.availableCount;
  const resetCredits = reset == null ? 0 : Number.isSafeInteger(count) && count >= 0 ? count : null;
  const expiries = (Array.isArray(reset?.credits) ? reset.credits : [])
    .filter(c => c.status === 'available' && c.resetType === 'codexRateLimits' && Number.isFinite(c.expiresAt) && c.expiresAt * 1000 > now)
    .map(c => c.expiresAt * 1000);
  const planType = typeof limits?.planType === 'string' && limits.planType.trim() ? limits.planType.trim() : null;
  return { planType, extraCredits, weekly: take(10080), session: take(300), resetCredits, resetCreditExpiry: resetCredits > 0 && expiries.length ? Math.min(...expiries) : null };
}
export function language(preference, locale = Intl.DateTimeFormat().resolvedOptions().locale) {
  return preference === 'zh' || preference === 'en' ? preference : /^zh/i.test(locale) ? 'zh' : 'en';
}
export function validSocket(value, port) {
  try {
    const u = new URL(value);
    return u.protocol === 'ws:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && u.port === String(port) && !u.username && !u.password;
  } catch { return false; }
}
export function eligiblePage(target) {
  if (target.type !== 'page') return false;
  try { return ['app:', 'file:'].includes(new URL(target.url).protocol); } catch { return false; }
}

// A client's helpers can inherit its listening socket. Every holder must belong
// to the one verified client process tree; an unrelated listener is rejected.
export function ownsListeners(pids, rows, app) {
  if (!app || !pids.length || pids.some(p => !/^\d+$/.test(p))) return false;
  const byId = new Map(rows.map(row => [row.pid, row]));
  const roots = pids.filter(pid => byId.get(pid)?.executable.startsWith(`${app}/Contents/MacOS/`));
  if (roots.length !== 1) return false;
  return pids.every(pid => {
    const visited = new Set();
    while (pid && !visited.has(pid)) {
      if (pid === roots[0]) return true;
      visited.add(pid); pid = byId.get(pid)?.parent;
    }
    return false;
  });
}
