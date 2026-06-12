import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = path.join(__dirname, 'data/snapshot.json');

// Debt baseline from debt-tracker.md — update balances here as they change
const DEBT_BASELINE = 7010.43;
const PAYOFF_TARGET_DATE = new Date('2026-12-31');
const DEBT_ACCOUNTS = [
  {
    key: 'usbank_cc',
    label: 'US Bank Credit Card',
    match: (a) => a.institution === 'U.S. Bank' && a.subtype === 'credit card',
    apr: 27.99,
    minPayment: 100,
    priority: 1,
  },
  {
    key: 'apple_card',
    label: 'Apple Card',
    // Not in Plaid yet — manual entry until CSV import is built
    manualBalance: 2981.19,
    apr: 25.49,
    minPayment: 71,
    priority: 2,
  },
  {
    key: 'usbank_loan',
    label: 'US Bank Car Loan',
    match: (a) => a.institution === 'U.S. Bank' && a.type === 'loan',
    apr: null,
    minPayment: 271.02,
    priority: 3,
  },
];

function loadSnapshot() {
  if (!existsSync(SNAPSHOT_FILE)) {
    console.error('No snapshot found. Run npm run plaid:sync first.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'));
}

function getDebtBalances(accounts) {
  return DEBT_ACCOUNTS.map((debt) => {
    let balance = debt.manualBalance ?? null;
    if (debt.match) {
      const acct = accounts.find(debt.match);
      if (acct) balance = acct.current;
    }
    return { ...debt, balance };
  });
}

function getCashAccounts(accounts) {
  return accounts.filter((a) => a.type === 'depository');
}

function monthsUntilPayoff() {
  const now = new Date();
  const diff = (PAYOFF_TARGET_DATE - now) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, diff);
}

function spendingByCategory(transactions) {
  const skip = new Set(['TRANSFER_IN', 'TRANSFER_OUT', 'PAYMENT', 'LOAN_PAYMENTS']);
  const totals = {};
  for (const t of transactions) {
    if (skip.has(t.category)) continue;
    if (t.amount <= 0) continue; // credits/refunds
    totals[t.category] = (totals[t.category] ?? 0) + t.amount;
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ category: cat, total: amt }));
}

function printDivider(char = '─', width = 52) {
  console.log(char.repeat(width));
}

function run() {
  const snapshot = loadSnapshot();
  const { accounts, transactions, synced_at } = snapshot;

  const debts = getDebtBalances(accounts);
  const cashAccounts = getCashAccounts(accounts);
  const totalDebt = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
  const totalCash = cashAccounts.reduce((s, a) => s + (a.current ?? 0), 0);
  const paidDown = DEBT_BASELINE - totalDebt;
  const progressPct = ((paidDown / DEBT_BASELINE) * 100).toFixed(1);
  const monthsLeft = monthsUntilPayoff();
  const requiredMonthly = monthsLeft > 0 ? (totalDebt / monthsLeft).toFixed(2) : '—';
  const spending = spendingByCategory(transactions);

  const bar = (pct) => {
    const filled = Math.round(pct / 5);
    return '[' + '#'.repeat(filled) + '.'.repeat(20 - filled) + ']';
  };

  console.log('\n');
  printDivider('=');
  console.log('  EA FINANCE SUMMARY');
  console.log(`  ${new Date(synced_at).toLocaleString()}`);
  printDivider('=');

  console.log('\n  CASH\n');
  for (const acct of cashAccounts) {
    const bal = acct.current ?? 0;
    const sign = bal >= 0 ? '+' : '';
    console.log(`  ${acct.institution} ${acct.name.padEnd(20)} ${sign}$${Math.abs(bal).toFixed(2)}`);
  }
  console.log(`\n  Total liquid:  $${totalCash.toFixed(2)}`);

  printDivider();

  console.log('\n  DEBT PAYOFF PROGRESS\n');
  console.log(`  Baseline:   $${DEBT_BASELINE.toFixed(2)}`);
  console.log(`  Current:    $${totalDebt.toFixed(2)}`);
  console.log(`  Paid down:  $${paidDown.toFixed(2)} (${progressPct}%)`);
  console.log(`\n  ${bar(parseFloat(progressPct))} ${progressPct}%\n`);
  console.log(`  Target: Debt-free by Dec 31, 2026`);
  console.log(`  Months left: ${monthsLeft.toFixed(1)}`);
  console.log(`  Required/month to hit target: ~$${requiredMonthly}`);

  printDivider();

  console.log('\n  DEBTS — AVALANCHE ORDER\n');
  for (const debt of debts) {
    const bal = debt.balance != null ? `$${debt.balance.toFixed(2)}` : 'N/A';
    const apr = debt.apr != null ? `${debt.apr}% APR` : 'fixed rate';
    const flag = debt.manualBalance != null ? ' (manual)' : '';
    console.log(`  [${debt.priority}] ${debt.label.padEnd(24)} ${bal.padStart(10)}  ${apr}${flag}`);
  }
  console.log(`\n      Total:                          $${totalDebt.toFixed(2)}`);
  console.log(`      Min payments/mo:                $442.02`);

  printDivider();

  console.log('\n  SPENDING THIS MONTH (top categories)\n');
  for (const { category, total } of spending.slice(0, 8)) {
    console.log(`  ${category.padEnd(28)} -$${total.toFixed(2)}`);
  }

  printDivider('=');
  console.log();
}

run();
