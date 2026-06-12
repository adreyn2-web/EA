import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRADES_FILE = path.join(__dirname, '../data/trades.json');

export function loadTrades() {
  if (!existsSync(TRADES_FILE)) return [];
  return JSON.parse(readFileSync(TRADES_FILE, 'utf8'));
}

export function saveTrade(trade) {
  const trades = loadTrades();
  const entry = parseFloat(trade.entry);
  const exit = parseFloat(trade.exit);
  const shares = parseFloat(trade.shares);
  const direction = trade.direction.toLowerCase();

  const pnlPerShare = direction === 'long' ? exit - entry : entry - exit;
  const pnl = parseFloat((pnlPerShare * shares).toFixed(2));
  const pnl_pct = parseFloat(((pnlPerShare / entry) * 100).toFixed(2));
  const outcome = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';
  const rr = trade.stop ? parseFloat((Math.abs(pnlPerShare) / Math.abs(entry - parseFloat(trade.stop))).toFixed(2)) : null;

  const record = {
    id: Date.now(),
    date: trade.date || new Date().toISOString().split('T')[0],
    ticker: trade.ticker.toUpperCase(),
    direction,
    entry,
    exit,
    shares,
    stop: trade.stop ? parseFloat(trade.stop) : null,
    pnl,
    pnl_pct,
    outcome,
    actual_rr: rr,
    setup: trade.setup || '',
    plan: trade.plan || '',
    notes: trade.notes || '',
    grade: trade.grade || '',
    emotion: trade.emotion || '',
    logged_at: new Date().toISOString(),
  };

  trades.push(record);
  writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
  return record;
}

export function calcStats(trades) {
  if (!trades.length) return null;

  const sorted = [...trades].sort((a, b) => (a.date < b.date ? 1 : -1));
  const wins = trades.filter((t) => t.outcome === 'win');
  const losses = trades.filter((t) => t.outcome === 'loss');
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;

  // Streak
  let streak = 0;
  const streakType = sorted[sorted.length - 1]?.outcome;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].outcome === streakType && streakType !== 'breakeven') streak++;
    else break;
  }

  // Equity curve — cumulative P&L per trade in date order
  let cumulative = 0;
  const equityCurve = sorted.map((t) => {
    cumulative += t.pnl;
    return { date: t.date, pnl: t.pnl, cumulative: parseFloat(cumulative.toFixed(2)) };
  });

  // Daily P&L map
  const dailyPnl = {};
  for (const t of trades) {
    if (!dailyPnl[t.date]) dailyPnl[t.date] = { pnl: 0, trades: 0, wins: 0 };
    dailyPnl[t.date].pnl = parseFloat((dailyPnl[t.date].pnl + t.pnl).toFixed(2));
    dailyPnl[t.date].trades++;
    if (t.outcome === 'win') dailyPnl[t.date].wins++;
  }

  // Setup breakdown
  const bySetup = {};
  for (const t of trades) {
    const key = t.setup || 'Untagged';
    if (!bySetup[key]) bySetup[key] = { trades: 0, wins: 0, pnl: 0 };
    bySetup[key].trades++;
    bySetup[key].pnl += t.pnl;
    if (t.outcome === 'win') bySetup[key].wins++;
  }
  const setupBreakdown = Object.entries(bySetup)
    .sort((a, b) => b[1].trades - a[1].trades)
    .map(([setup, d]) => ({
      setup,
      trades: d.trades,
      win_rate: parseFloat(((d.wins / d.trades) * 100).toFixed(1)),
      pnl: parseFloat(d.pnl.toFixed(2)),
    }));

  // Grade breakdown
  const byGrade = {};
  for (const t of trades.filter((t) => t.grade)) {
    if (!byGrade[t.grade]) byGrade[t.grade] = { trades: 0, pnl: 0, wins: 0 };
    byGrade[t.grade].trades++;
    byGrade[t.grade].pnl += t.pnl;
    if (t.outcome === 'win') byGrade[t.grade].wins++;
  }

  // Emotion breakdown
  const byEmotion = {};
  for (const t of trades.filter((t) => t.emotion)) {
    if (!byEmotion[t.emotion]) byEmotion[t.emotion] = { trades: 0, pnl: 0, wins: 0 };
    byEmotion[t.emotion].trades++;
    byEmotion[t.emotion].pnl += t.pnl;
    if (t.outcome === 'win') byEmotion[t.emotion].wins++;
  }

  const best = trades.reduce((a, b) => (a.pnl > b.pnl ? a : b));
  const worst = trades.reduce((a, b) => (a.pnl < b.pnl ? a : b));

  return {
    total_trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: parseFloat(winRate.toFixed(1)),
    total_pnl: parseFloat(totalPnl.toFixed(2)),
    avg_win: parseFloat(avgWin.toFixed(2)),
    avg_loss: parseFloat(avgLoss.toFixed(2)),
    profit_factor: profitFactor ? parseFloat(profitFactor.toFixed(2)) : null,
    streak: { count: streak, type: streakType },
    best_trade: { ticker: best.ticker, pnl: best.pnl, date: best.date },
    worst_trade: { ticker: worst.ticker, pnl: worst.pnl, date: worst.date },
    equity_curve: equityCurve,
    daily_pnl: dailyPnl,
    setup_breakdown: setupBreakdown,
    grade_breakdown: byGrade,
    emotion_breakdown: byEmotion,
    recent: sorted.slice(-20).reverse(),
  };
}
