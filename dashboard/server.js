import express from 'express';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { loadTrades, calcStats, saveTrade } from '../projects/trading-bot/performance/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_FILE = path.join(ROOT, 'projects/finance/data/snapshot.json');
const GOALS_FILE = path.join(ROOT, 'context/goals.md');
const APPLE_CARD_FILE = path.join(ROOT, 'projects/finance/data/apple_card.json');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEBT_BASELINE = 7010.43;
const PAYOFF_TARGET = new Date('2026-12-31');

const DEBT_ACCOUNTS = [
  { label: 'US Bank Credit Card', match: (a) => a.institution === 'U.S. Bank' && a.subtype === 'credit card', apr: 27.99, minPayment: 100, priority: 1 },
  { label: 'Apple Card', manualBalance: 2981.19, apr: 25.49, minPayment: 71, priority: 2 },
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
    let balance = d.manualBalance ?? null;
    if (d.match) {
      const acct = accounts.find(d.match);
      if (acct) balance = acct.current;
    }
    return { label: d.label, balance, apr: d.apr, minPayment: d.minPayment, priority: d.priority, manual: !!d.manualBalance };
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

  const recentTransactions = transactions.slice(0, 25).map((t) => ({
    date: t.date,
    name: t.name.length > 50 ? t.name.slice(0, 50) + '…' : t.name,
    amount: t.amount,
    category: t.category,
  }));

  return { synced_at, cashAccounts, totalCash, debts, totalDebt, debtBaseline: DEBT_BASELINE, paidDown, progressPct, monthsLeft, requiredMonthly, spending, recentTransactions };
}

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

app.get('/api/apple-card', (_req, res) => {
  if (!existsSync(APPLE_CARD_FILE)) return res.json({ ok: false, data: null });
  res.json({ ok: true, data: JSON.parse(readFileSync(APPLE_CARD_FILE, 'utf8')) });
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

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`EA Dashboard running at http://localhost:${PORT}`);
});
