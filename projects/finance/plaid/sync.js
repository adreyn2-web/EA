import { config as loadEnv } from 'dotenv';
import { PlaidApi, PlaidEnvironments, Configuration } from 'plaid';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const TOKENS_FILE = path.join(__dirname, '../data/access_tokens.json');
const SNAPSHOT_FILE = path.join(__dirname, '../data/snapshot.json');

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(config);

function loadTokens() {
  if (!existsSync(TOKENS_FILE)) {
    console.error('No access tokens found. Run npm run plaid:link first.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
}

async function getBalances(institutionName, accessToken) {
  const res = await client.accountsBalanceGet({ access_token: accessToken });
  return res.data.accounts.map((acct) => {
    const isDeposit = acct.type === 'depository';
    const balance = isDeposit && acct.balances.available != null
      ? acct.balances.available
      : acct.balances.current;
    return {
      institution: institutionName,
      name: acct.name,
      type: acct.type,
      subtype: acct.subtype,
      current: balance,
      available: acct.balances.available,
      limit: acct.balances.limit ?? null,
    };
  });
}

async function getTransactions(accessToken, accounts, daysBack = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);

  const fmt = (d) => d.toISOString().split('T')[0];

  const res = await client.transactionsGet({
    access_token: accessToken,
    start_date: fmt(start),
    end_date: fmt(end),
    options: { count: 100, offset: 0 },
  });

  const accountMap = Object.fromEntries(accounts.map((a) => [a.account_id ?? a.name, a]));

  return res.data.transactions.map((t) => {
    const acct = res.data.accounts.find((a) => a.account_id === t.account_id);
    let account = 'Unknown';
    if (acct) {
      const inst = accounts.find((a) => a.name === acct.name)?.institution ?? '';
      const sub = acct.subtype ?? acct.type ?? '';
      if (sub === 'checking') account = `${inst} Checking`;
      else if (sub === 'credit card') account = `${inst} Credit`;
      else if (sub === 'loan') account = `${inst} Loan`;
      else account = `${inst} ${sub}`.trim();
    }
    return {
      date: t.date,
      name: t.name,
      amount: t.amount,
      category: t.personal_finance_category?.primary ?? t.category?.[0] ?? 'Uncategorized',
      account_id: t.account_id,
      account,
      pending: t.pending ?? false,
    };
  });
}

async function sync() {
  const tokens = loadTokens();
  const institutions = Object.entries(tokens);

  console.log(`\nSyncing ${institutions.length} institution(s)...\n`);

  const allAccounts = [];
  const allTransactions = [];

  for (const [name, { access_token }] of institutions) {
    try {
      const accounts = await getBalances(name, access_token);
      const transactions = await getTransactions(access_token, accounts);
      allAccounts.push(...accounts);
      allTransactions.push(...transactions);
      console.log(`  ${name}: ${accounts.length} account(s), ${transactions.length} transaction(s)`);
    } catch (err) {
      const msg = err?.response?.data?.error_message ?? err.message;
      console.error(`  ${name}: ERROR — ${msg}`);
    }
  }

  // Sort transactions newest first
  allTransactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  const snapshot = {
    synced_at: new Date().toISOString(),
    accounts: allAccounts,
    transactions: allTransactions,
  };

  writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));

  printSummary(snapshot);
}

function printSummary({ accounts, transactions, synced_at }) {
  console.log('\n=== ACCOUNT BALANCES ===');

  let totalCash = 0;
  let totalDebt = 0;

  for (const acct of accounts) {
    const balance = acct.current ?? 0;
    const isDebt = acct.type === 'credit' || acct.type === 'loan' || acct.subtype === 'line of credit' || acct.subtype === 'student' || acct.subtype === 'auto';
    const label = isDebt ? `  -$${Math.abs(balance).toFixed(2)}` : `  $${balance.toFixed(2)}`;

    console.log(`  [${acct.institution}] ${acct.name} (${acct.subtype ?? acct.type}): ${label}`);

    if (isDebt) {
      totalDebt += Math.abs(balance);
    } else {
      totalCash += balance;
    }
  }

  console.log(`\n  Cash total:  $${totalCash.toFixed(2)}`);
  console.log(`  Debt total: -$${totalDebt.toFixed(2)}`);
  console.log(`  Net:        $${(totalCash - totalDebt).toFixed(2)}`);

  console.log('\n=== RECENT TRANSACTIONS (last 30 days) ===');
  const recent = transactions.slice(0, 20);
  for (const t of recent) {
    const sign = t.amount > 0 ? '-' : '+';
    const amt = Math.abs(t.amount).toFixed(2);
    console.log(`  ${t.date}  ${sign}$${amt.padStart(8)}  ${t.category.padEnd(20)}  ${t.name}`);
  }
  if (transactions.length > 20) {
    console.log(`  ... and ${transactions.length - 20} more (see snapshot.json)`);
  }

  console.log(`\nSnapshot saved to projects/finance/data/snapshot.json`);
  console.log(`Synced at: ${new Date(synced_at).toLocaleString()}\n`);
}

sync();
