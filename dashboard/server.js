import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync, watch } from 'fs';
import { execSync, execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { loadTrades, calcStats, saveTrade } from '../projects/trading-bot/performance/stats.js';

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_FILE = path.join(ROOT, 'projects/finance/data/snapshot.json');
const GOALS_FILE = path.join(ROOT, 'context/goals.md');
const APPLE_CARD_FILE = path.join(ROOT, 'projects/finance/data/apple_card.json');
const INCOME_LOG_FILE = path.join(ROOT, 'income/income-log.md');
const MEAL_PLAN_FILE = path.join(ROOT, 'projects/meal-plan/data/meal_plan.json');
const MEAL_TRACKER_FILE = path.join(ROOT, 'projects/meal-plan/data/tracker.json');

const AUTH_TOKEN = (process.env.DASHBOARD_USER && process.env.DASHBOARD_PASS)
  ? Buffer.from(`${process.env.DASHBOARD_USER}:${process.env.DASHBOARD_PASS}`).toString('base64')
  : null;

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.split('=');
    if (k) out[k.trim()] = decodeURIComponent(v.join('=').trim());
  }
  return out;
}

const LOGIN_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>COMPASS — Login</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#1b1714;color:#ece3d3;font-family:'SF Mono','Fira Code','Menlo',monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#221e19;border:1px solid #362f27;border-radius:3px;padding:36px 32px;width:320px}
.wordmark{display:flex;align-items:center;gap:10px;margin-bottom:26px}
.enso{width:22px;height:22px;flex-shrink:0;opacity:.85}
h1{font-family:'Shippori Mincho',serif;font-size:17px;font-weight:700;letter-spacing:.06em;color:#c99552}
label{font-size:10px;color:#8d8071;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:5px}
input{width:100%;background:#2b2620;border:1px solid #443a30;color:#ece3d3;font-family:inherit;font-size:13px;padding:8px 10px;border-radius:2px;outline:none;margin-bottom:14px}
input:focus{border-color:#c99552}button{width:100%;background:transparent;border:1px solid #c99552;color:#c99552;font-family:inherit;font-size:13px;padding:9px;border-radius:2px;cursor:pointer;letter-spacing:.06em}
button:hover{background:#c99552;color:#1b1714}.err{font-size:11px;color:#b5573c;margin-bottom:12px;display:none}.err.show{display:block}</style></head>
<body><div class="card"><div class="wordmark"><svg class="enso" viewBox="0 0 100 100" fill="none"><path d="M50 8 C74 8 92 27 92 51 C92 73 75 90 53 92 C33 94 15 82 9 64" stroke="#c99552" stroke-width="7" stroke-linecap="round"/></svg><h1>COMPASS</h1></div><div class="err" id="err">Incorrect credentials.</div>
<form method="POST" action="/login"><label>Username</label><input name="user" type="text" autocomplete="username" autofocus/>
<label>Password</label><input name="pass" type="password" autocomplete="current-password"/>
<button type="submit">Sign In</button></form></div>
<script>if(location.search.includes('err'))document.getElementById('err').classList.add('show')</script></body></html>`;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/login', (_req, res) => res.send(LOGIN_HTML));

app.post('/login', (req, res) => {
  const token = Buffer.from(`${req.body.user}:${req.body.pass}`).toString('base64');
  if (AUTH_TOKEN && token === AUTH_TOKEN) {
    res.setHeader('Set-Cookie', `ea_auth=${AUTH_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.redirect('/');
  }
  res.redirect('/login?err=1');
});

app.get('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'ea_auth=; Path=/; Max-Age=0');
  res.redirect('/login');
});

if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    if (req.path === '/login') return next();
    const cookies = parseCookies(req);
    if (cookies.ea_auth === AUTH_TOKEN) return next();
    res.redirect('/login');
  });
}

app.use(express.static(path.join(__dirname, 'public')));

// ── SSE live-update infrastructure ──
const sseClients = new Set();
const _debounceTimers = {};

function notifyClients(type) {
  const msg = `data: ${JSON.stringify({ type })}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch (_) { sseClients.delete(res); }
  }
}

function watchForChanges(filePath, type) {
  const target = existsSync(filePath) ? filePath : path.dirname(filePath);
  watch(target, (event, filename) => {
    if (filePath !== target && filename !== path.basename(filePath)) return;
    clearTimeout(_debounceTimers[type]);
    _debounceTimers[type] = setTimeout(() => notifyClients(type), 400);
  });
}

const DEBT_BASELINE = 7010.43;
const PAYOFF_TARGET = new Date('2026-12-31');

const DEBT_ACCOUNTS = [
  { label: 'US Bank Credit Card', match: (a) => a.institution === 'U.S. Bank' && a.subtype === 'credit card', apr: 27.99, minPayment: 100, priority: 1 },
  { label: 'Apple Card', fromAppleCard: true, apr: 25.49, minPayment: 71, priority: 2 },
  { label: 'US Bank Car Loan', match: (a) => a.institution === 'U.S. Bank' && a.type === 'loan', apr: null, minPayment: 271.02, priority: 3 },
];

function loadSnapshot() {
  if (!existsSync(SNAPSHOT_FILE)) return null;
  return JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'));
}

function buildFinanceData(snapshot) {
  if (!snapshot) return null;
  const { accounts, transactions, synced_at } = snapshot;

  const cashAccounts = accounts.filter((a) => a.type === 'depository').map((a) => ({
    label: `${a.institution} ${a.name}`,
    balance: a.current,
  }));
  const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0);

  const debts = DEBT_ACCOUNTS.map((d) => {
    let balance = null;
    let source = 'unknown';
    if (d.match) {
      const acct = accounts.find(d.match);
      if (acct) { balance = acct.current; source = 'plaid'; }
    }
    if (d.fromAppleCard && existsSync(APPLE_CARD_FILE)) {
      try { balance = JSON.parse(readFileSync(APPLE_CARD_FILE, 'utf8')).current_balance; source = 'statement'; } catch (_) {}
    }
    return { label: d.label, balance, apr: d.apr, minPayment: d.minPayment, priority: d.priority, source };
  });
  const totalDebt = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
  const paidDown = DEBT_BASELINE - totalDebt;
  const progressPct = Math.max(0, (paidDown / DEBT_BASELINE) * 100);
  const monthsLeft = Math.max(0, (PAYOFF_TARGET - new Date()) / (1000 * 60 * 60 * 24 * 30.44));
  const requiredMonthly = monthsLeft > 0 ? totalDebt / monthsLeft : 0;

  const skipCategories = new Set(['TRANSFER_IN', 'TRANSFER_OUT', 'PAYMENT', 'LOAN_PAYMENTS']);
  const spendingMap = {};
  for (const t of transactions) {
    if (skipCategories.has(t.category) || t.amount <= 0) continue;
    spendingMap[t.category] = (spendingMap[t.category] ?? 0) + t.amount;
  }
  const spending = Object.entries(spendingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, total]) => ({ category, total }));

  const appleCardTxs = (() => {
    if (!existsSync(APPLE_CARD_FILE)) return [];
    try {
      const ac = JSON.parse(readFileSync(APPLE_CARD_FILE, 'utf8'));
      return (ac.transactions || []).map((t) => ({
        date: t.date,
        name: t.name,
        amount: t.amount,
        category: t.category ?? 'Uncategorized',
        account: 'Apple Card',
        pending: false,
      }));
    } catch (_) { return []; }
  })();

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const allTxs = [
    ...transactions.map((t) => ({ ...t, account: t.account ?? 'Unknown' })),
    ...appleCardTxs.filter((t) => t.date >= cutoffStr),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  // Compute running balance per account (from current balance, working backwards)
  const accountBalanceMap = {};
  for (const acct of accounts) {
    accountBalanceMap[acct.name] = acct.current;
  }
  accountBalanceMap['Apple Card'] = existsSync(APPLE_CARD_FILE)
    ? (() => { try { return JSON.parse(readFileSync(APPLE_CARD_FILE, 'utf8')).current_balance; } catch (_) { return null; } })()
    : null;

  // Map account label → current running balance tracker
  const runningBalance = {};
  for (const [name, bal] of Object.entries(accountBalanceMap)) {
    const label = name === 'Apple Card' ? 'Apple Card'
      : name.includes('CHECKING') || name.includes('Checking') ? `${accounts.find(a => a.name === name)?.institution ?? ''} Checking`
      : name.includes('Credit') ? `${accounts.find(a => a.name === name)?.institution ?? ''} Credit`
      : name.includes('Loan') ? `${accounts.find(a => a.name === name)?.institution ?? ''} Loan`
      : name;
    runningBalance[label] = bal;
  }
  // Also seed from account labels directly
  for (const acct of accounts) {
    const label = acct.subtype === 'checking' ? `${acct.institution} Checking`
      : acct.subtype === 'credit card' ? `${acct.institution} Credit`
      : acct.subtype === 'loan' ? `${acct.institution} Loan`
      : `${acct.institution} ${acct.subtype ?? acct.type}`.trim();
    runningBalance[label] = acct.current;
  }

  const today = new Date().toISOString().split('T')[0];
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const staleCutoff = twoDaysAgo.toISOString().split('T')[0];

  const postedTxs = allTxs.filter((t) => !t.pending || t.date <= staleCutoff);
  const pendingTxs = allTxs.filter((t) => t.pending && t.date > staleCutoff);

  // Assign balance_after to each posted tx (newest first, working backwards)
  const postedWithBalance = postedTxs.slice(0, 50).map((t) => {
    const acctKey = t.account;
    const balAfter = runningBalance[acctKey] ?? null;
    if (balAfter !== null) runningBalance[acctKey] = balAfter + t.amount;
    return {
      date: t.date,
      name: t.name.length > 50 ? t.name.slice(0, 50) + '…' : t.name,
      amount: t.amount,
      category: t.category,
      account: t.account,
      balance_after: balAfter,
    };
  });

  const pendingFormatted = pendingTxs.map((t) => ({
    date: t.date,
    name: t.name.length > 50 ? t.name.slice(0, 50) + '…' : t.name,
    amount: t.amount,
    category: t.category,
    account: t.account,
    balance_after: null,
  }));

  const recentTransactions = { posted: postedWithBalance, pending: pendingFormatted };

  return { synced_at, cashAccounts, totalCash, debts, totalDebt, debtBaseline: DEBT_BASELINE, paidDown, progressPct, monthsLeft, requiredMonthly, spending, recentTransactions };
}

function parseDollar(str) {
  return parseFloat((str || '').replace(/[~$,*\s]/g, '')) || 0;
}

function parseMdTableRows(text) {
  return text
    .split('\n')
    .filter(l => l.trim().startsWith('|'))
    .map(l => l.split('|').slice(1, -1).map(c => c.trim()))
    .filter(cells => cells.length >= 2 && !cells.every(c => /^[-\s]*$/.test(c)));
}

function parseIncomeLog() {
  if (!existsSync(INCOME_LOG_FILE)) return null;
  const raw = readFileSync(INCOME_LOG_FILE, 'utf8');

  const sectionMap = {};
  let current = null;
  let buffer = [];
  for (const line of raw.split('\n')) {
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      if (current !== null) sectionMap[current] = buffer;
      current = h2[1].trim();
      buffer = [];
    } else if (current !== null) {
      buffer.push(line);
    }
  }
  if (current !== null) sectionMap[current] = buffer;

  const totalsRows = parseMdTableRows((sectionMap['Totals (All-Time)'] || []).join('\n'));
  const totals = {};
  for (const row of totalsRows.slice(1)) {
    if (row[0]) totals[row[0].replace(/\*/g, '').trim()] = parseDollar(row[1]);
  }

  const monthlyRows = parseMdTableRows((sectionMap['Monthly Net Totals'] || []).join('\n'));
  const monthly = monthlyRows.slice(1)
    .filter(r => r[0] && !r[0].startsWith('**'))
    .map(r => ({
      month: r[0].replace(/\*/g, '').replace(/\s*\(partial\)\s*/g, '').trim(),
      partial: r[0].includes('partial'),
      casinoNet: parseDollar(r[1]),
      rootsNet: parseDollar(r[2]),
      combinedNet: parseDollar(r[3]),
    }));

  function parseStubs(sectionKey) {
    const rows = parseMdTableRows((sectionMap[sectionKey] || []).join('\n'));
    return rows.slice(1)
      .filter(r => r[0] && !r[0].startsWith('**'))
      .map(r => ({
        payDate: r[0],
        period: r[1],
        gross: parseDollar(r[2]),
        net: parseDollar(r[3]),
        tips: parseDollar(r[4]),
        hours: parseFloat((r[5] || '').replace(/[*,\s]/g, '')) || 0,
      }));
  }

  const casino = parseStubs('Prairie Meadows Casino — Pay Stub Detail');
  const roots = parseStubs('Roots 95 — Pay Stub Detail');

  const casinoTips = casino.reduce((s, r) => s + r.tips, 0);
  const casinoHourly = casino.reduce((s, r) => s + Math.max(0, r.gross - r.tips), 0);
  const rootsTips = roots.reduce((s, r) => s + r.tips, 0);
  const rootsHourly = roots.reduce((s, r) => s + Math.max(0, r.gross - r.tips), 0);

  return { totals, monthly, casino, roots, breakdown: { casinoTips, casinoHourly, rootsTips, rootsHourly } };
}

function loadMealTracker() {
  if (!existsSync(MEAL_TRACKER_FILE)) return [];
  try { return JSON.parse(readFileSync(MEAL_TRACKER_FILE, 'utf8')); } catch (_) { return []; }
}

function buildMealPlanData() {
  if (!existsSync(MEAL_PLAN_FILE)) return null;
  let plan;
  try { plan = JSON.parse(readFileSync(MEAL_PLAN_FILE, 'utf8')); } catch (_) { return null; }

  const days = (plan.days || []).map((d) => ({
    day: d.day,
    daily_totals: d.daily_totals,
    meals: (d.meals || []).map((m) => ({
      meal_type: m.meal_type,
      recipe_name: m.recipe_name,
      macros: m.macros,
      estimated_cost_usd: m.estimated_cost_usd,
      prep_time_minutes: m.prep_time_minutes,
    })),
  }));

  const tracker = loadMealTracker();
  const history = tracker.slice(-4).reverse();
  const currentEntry = tracker.find((e) => e.week_of === plan.week_of) || null;

  return {
    week_of: plan.week_of,
    macro_targets: plan.macro_targets,
    estimated_weekly_cost_usd: plan.estimated_weekly_cost_usd,
    grocery_list: plan.grocery_list,
    days,
    current_feedback: currentEntry,
    history,
  };
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(': connected\n\n');
  sseClients.add(res);
  const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 25000);
  req.on('close', () => { clearInterval(hb); sseClients.delete(res); });
});

app.get('/api/finance', (_req, res) => {
  const snapshot = loadSnapshot();
  const data = buildFinanceData(snapshot);
  res.json({ ok: !!data, data });
});

app.get('/api/goals', (_req, res) => {
  if (!existsSync(GOALS_FILE)) return res.json({ ok: false });
  const raw = readFileSync(GOALS_FILE, 'utf8');
  const sections = {};
  let current = null;
  for (const line of raw.split('\n')) {
    const heading = line.match(/^## (.+)/);
    if (heading) { current = heading[1].trim(); sections[current] = []; continue; }
    const item = line.match(/^- \[([ x])\] (.+)/);
    if (item && current) sections[current].push({ done: item[1] === 'x', text: item[2].trim() });
  }
  res.json({ ok: true, sections });
});

app.get('/api/trading', (_req, res) => {
  const trades = loadTrades();
  const stats = calcStats(trades);
  res.json({ ok: true, stats, trade_count: trades.length });
});

app.post('/api/trade', (req, res) => {
  try {
    const trade = saveTrade(req.body);
    const stats = calcStats(loadTrades());
    res.json({ ok: true, trade, stats });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.get('/api/income', (_req, res) => {
  const data = parseIncomeLog();
  res.json({ ok: !!data, data });
});

app.get('/api/apple-card', (_req, res) => {
  if (!existsSync(APPLE_CARD_FILE)) return res.json({ ok: false, data: null });
  res.json({ ok: true, data: JSON.parse(readFileSync(APPLE_CARD_FILE, 'utf8')) });
});

app.get('/api/meal-plan', (_req, res) => {
  const data = buildMealPlanData();
  res.json({ ok: !!data, data });
});

app.post('/api/meal-plan/generate', (_req, res) => {
  try {
    execSync('npm run meal:generate', { cwd: ROOT, timeout: 150000 });
    res.json({ ok: true, data: buildMealPlanData() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/meal-plan/feedback', (req, res) => {
  const { week_of, actual_cost, rating, notes } = req.body;
  if (!week_of) return res.status(400).json({ ok: false, error: 'week_of is required.' });

  const entries = loadMealTracker();
  let entry = entries.find((e) => e.week_of === week_of);
  if (!entry) { entry = { week_of }; entries.push(entry); }

  if (actual_cost !== undefined && actual_cost !== null && actual_cost !== '') entry.actual_cost = Number(actual_cost);
  if (rating !== undefined && rating !== null && rating !== '') entry.rating = Number(rating);
  if (notes) entry.notes = notes;
  entry.logged_at = new Date().toISOString().split('T')[0];

  entries.sort((a, b) => (a.week_of < b.week_of ? -1 : 1));
  mkdirSync(path.dirname(MEAL_TRACKER_FILE), { recursive: true });
  writeFileSync(MEAL_TRACKER_FILE, JSON.stringify(entries, null, 2));
  res.json({ ok: true, entry });
});

// ── Compass chat (backed by the `claude` CLI itself, read-only tools for now) ──
let chatSessionId = null;
let chatBusy = false;
const CHAT_ALLOWED_TOOLS = 'Read,Grep,Glob';

function runClaude(message, sessionId) {
  const args = ['-p', message, '--output-format', 'json', '--tools', CHAT_ALLOWED_TOOLS];
  if (sessionId) args.push('--resume', sessionId);
  return new Promise((resolve, reject) => {
    execFile('claude', args, { cwd: ROOT, timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); } catch (_) { reject(new Error('Could not parse Claude response.')); }
    });
  });
}

app.post('/api/chat', async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) return res.status(400).json({ ok: false, error: 'Message is empty.' });
  if (chatBusy) return res.status(429).json({ ok: false, error: 'Compass is still responding to your last message.' });

  chatBusy = true;
  try {
    const result = await runClaude(message, chatSessionId);
    chatSessionId = result.session_id;
    if (result.is_error) {
      return res.status(500).json({ ok: false, error: result.result || 'Compass hit an error.' });
    }
    res.json({ ok: true, reply: result.result, cost: result.total_cost_usd });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    chatBusy = false;
  }
});

app.post('/api/chat/reset', (_req, res) => {
  chatSessionId = null;
  res.json({ ok: true });
});

app.post('/api/sync', (_req, res) => {
  try {
    execSync('node projects/finance/plaid/sync.js', { cwd: ROOT, timeout: 30000 });
    const snapshot = loadSnapshot();
    const data = buildFinanceData(snapshot);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── File watchers ──
watchForChanges(SNAPSHOT_FILE, 'finance');
watchForChanges(GOALS_FILE, 'goals');
watchForChanges(APPLE_CARD_FILE, 'apple-card');
watchForChanges(INCOME_LOG_FILE, 'income');
watchForChanges(path.join(ROOT, 'projects/trading-bot/performance'), 'trading');
watchForChanges(path.join(ROOT, 'projects/meal-plan/data'), 'meal-plan');

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`COMPASS running at http://localhost:${PORT}`);
});
