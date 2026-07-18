/**
 * Apple Card CSV Importer
 *
 * How to export from Apple Card:
 *   iPhone → Wallet → Apple Card → scroll to bottom → Export Transactions
 *   Save the CSV, then run:
 *
 *   node projects/finance/apple-card/import.js <path-to-csv> <current-balance>
 *
 * Example:
 *   node projects/finance/apple-card/import.js ~/Downloads/AppleCard.csv 2981.19
 *
 * Apple Card CSV columns:
 *   Transaction Date, Clearing Date, Description, Merchant, Category, Type, Amount (USD)
 *   Purchases are positive, payments are negative.
 */

import { createReadStream, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, '../data/apple_card.json');

const csvPath = process.argv[2];
const currentBalance = parseFloat(process.argv[3]);

if (!csvPath) {
  console.error('Usage: node import.js <path-to-csv> <current-balance>');
  console.error('Example: node import.js ~/Downloads/AppleCard.csv 2981.19');
  process.exit(1);
}

if (isNaN(currentBalance)) {
  console.error('Error: current-balance must be a number (e.g. 2981.19)');
  process.exit(1);
}

const rl = createInterface({ input: createReadStream(csvPath) });
const transactions = [];
let headers = null;

rl.on('line', (line) => {
  if (!line.trim()) return;
  const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
  if (!headers) { headers = cols; return; }

  const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
  const amount = parseFloat(row['Amount (USD)']);
  if (isNaN(amount)) return;

  const rawDate = row['Transaction Date'];
  const [m, d, y] = rawDate.split('/');
  const isoDate = y && m && d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : rawDate;

  transactions.push({
    date: isoDate,
    name: row['Description'] || row['Merchant'] || 'Unknown',
    merchant: row['Merchant'] || '',
    category: (row['Category'] || 'Uncategorized').toUpperCase().replace(/ /g, '_'),
    amount,
    type: row['Type'] || '',
  });
});

rl.on('close', () => {
  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  const result = {
    imported_at: new Date().toISOString(),
    current_balance: currentBalance,
    transaction_count: transactions.length,
    transactions,
  };

  writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));

  console.log(`\nApple Card import complete`);
  console.log(`  Balance:      $${currentBalance.toFixed(2)}`);
  console.log(`  Transactions: ${transactions.length}`);
  console.log(`  Saved to:     projects/finance/data/apple_card.json\n`);
});
