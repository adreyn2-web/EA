/**
 * Trade Journal — log a completed trade
 *
 * Usage:
 *   node projects/trading-bot/journal/log.js \
 *     --ticker AAPL \
 *     --direction long \
 *     --entry 150.00 \
 *     --exit 152.50 \
 *     --shares 10 \
 *     --date 2026-06-11 \        (optional, defaults to today)
 *     --setup "breakout pullback" \
 *     --notes "clean break above daily resistance, held through first pullback"
 *
 *   npm run trade:log -- --ticker SPY --direction short --entry 540 --exit 537 --shares 5
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRADES_FILE = path.join(__dirname, '../data/trades.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      map[args[i].slice(2)] = args[i + 1] ?? true;
      i++;
    }
  }
  return map;
}

function loadTrades() {
  if (!existsSync(TRADES_FILE)) return [];
  return JSON.parse(readFileSync(TRADES_FILE, 'utf8'));
}

function saveTrades(trades) {
  writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
}

function run() {
  const args = parseArgs();

  const required = ['ticker', 'direction', 'entry', 'exit', 'shares'];
  const missing = required.filter((k) => !args[k]);
  if (missing.length) {
    console.error(`Missing required fields: ${missing.join(', ')}`);
    console.error('Run with --help to see usage.');
    process.exit(1);
  }

  const ticker = args.ticker.toUpperCase();
  const direction = args.direction.toLowerCase();
  if (!['long', 'short'].includes(direction)) {
    console.error('--direction must be "long" or "short"');
    process.exit(1);
  }

  const entry = parseFloat(args.entry);
  const exit = parseFloat(args.exit);
  const shares = parseFloat(args.shares);

  if ([entry, exit, shares].some(isNaN)) {
    console.error('--entry, --exit, and --shares must be numbers');
    process.exit(1);
  }

  const pnlPerShare = direction === 'long' ? exit - entry : entry - exit;
  const pnl = parseFloat((pnlPerShare * shares).toFixed(2));
  const pnlPct = parseFloat(((pnlPerShare / entry) * 100).toFixed(2));
  const outcome = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';

  const today = new Date().toISOString().split('T')[0];
  const trade = {
    id: Date.now(),
    date: args.date ?? today,
    ticker,
    direction,
    entry,
    exit,
    shares,
    pnl,
    pnl_pct: pnlPct,
    outcome,
    setup: args.setup ?? '',
    notes: args.notes ?? '',
    logged_at: new Date().toISOString(),
  };

  const trades = loadTrades();
  trades.push(trade);
  saveTrades(trades);

  const sign = pnl >= 0 ? '+' : '';
  console.log(`\nTrade logged`);
  console.log(`  ${ticker} ${direction.toUpperCase()}  ${shares} shares @ $${entry} → $${exit}`);
  console.log(`  P&L: ${sign}$${pnl.toFixed(2)} (${sign}${pnlPct}%)  [${outcome.toUpperCase()}]`);
  if (trade.setup) console.log(`  Setup: ${trade.setup}`);
  if (trade.notes) console.log(`  Notes: ${trade.notes}`);
  console.log(`  Trade #${trades.length} logged.\n`);
}

run();
