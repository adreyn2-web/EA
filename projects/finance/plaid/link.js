import { config as loadEnv } from 'dotenv';
import { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } from 'plaid';
import http from 'http';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const TOKENS_FILE = path.join(__dirname, '../data/access_tokens.json');

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

async function createLinkToken() {
  const response = await client.linkTokenCreate({
    user: { client_user_id: 'adreyn' },
    client_name: 'EA Finance',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  });
  return response.data.link_token;
}

function saveAccessToken(institutionName, accessToken, itemId) {
  const tokens = existsSync(TOKENS_FILE)
    ? JSON.parse(readFileSync(TOKENS_FILE, 'utf8'))
    : {};
  tokens[institutionName] = { access_token: accessToken, item_id: itemId };
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  console.log(`Saved access token for: ${institutionName}`);
}

const HTML = (linkToken) => `<!DOCTYPE html>
<html>
<head><title>EA Finance — Link Account</title>
<style>
  body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f0f0f; color: #fff; }
  .card { text-align: center; padding: 2rem; }
  button { background: #fff; color: #000; border: none; padding: 12px 28px; font-size: 16px; border-radius: 6px; cursor: pointer; margin-top: 1rem; }
  button:hover { background: #e0e0e0; }
  #status { margin-top: 1rem; font-size: 14px; color: #aaa; }
</style>
</head>
<body>
<div class="card">
  <h2>EA Finance</h2>
  <p>Click below to link a bank account.</p>
  <button id="link-btn">Link Account</button>
  <div id="status"></div>
</div>
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
<script>
  const handler = Plaid.create({
    token: '${linkToken}',
    onSuccess: async (public_token, metadata) => {
      document.getElementById('status').textContent = 'Exchanging token...';
      const res = await fetch('/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token, institution: metadata.institution.name }),
      });
      const data = await res.json();
      document.getElementById('status').textContent = data.message;
    },
    onExit: (err) => {
      if (err) document.getElementById('status').textContent = 'Error: ' + err.display_message;
    },
  });
  document.getElementById('link-btn').onclick = () => handler.open();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const linkToken = await createLinkToken();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML(linkToken));
  } else if (req.method === 'POST' && req.url === '/exchange') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      const { public_token, institution } = JSON.parse(body);
      const exchange = await client.itemPublicTokenExchange({ public_token });
      const { access_token, item_id } = exchange.data;
      saveAccessToken(institution, access_token, item_id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Linked: ${institution}` }));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3001, () => {
  console.log('Open http://localhost:3001 to link an account');
  console.log('Run this once per institution. Ctrl+C when done.');
});
