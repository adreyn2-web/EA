import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// This endpoint is deliberately unauthenticated (see server.js), so uploaded "photos" are
// bounded hard: capped count, capped decoded size, and restricted to a fixed image-mime
// allowlist that also determines the file extension — never trust the client's filename or
// declared type for anything that touches the filesystem.
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3MB decoded — generous headroom over the client-side resize target (~1600px JPEG, typically well under 1MB)
const ALLOWED_MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Where the "you've got a submission" heads-up email goes — the account gws is
// already authenticated as (see CLAUDE.md Tool Integrations).
const NOTIFY_EMAIL = 'adreynf@perspectiveautomation.com';

// /submit is unauthenticated by design (see below), which means anyone with the link — not
// just Michelle — can hit it directly and repeatedly. Without a limit, that's a free way to
// spam a real inbox (every submission fires a gws gmail send) and grow submissions.json
// without bound. Per-IP, in-memory, resets on restart — proportionate to a single-node
// personal tool, not meant to survive a distributed attack.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const submitTimestampsByIp = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (submitTimestampsByIp.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  submitTimestampsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_PER_WINDOW;
}

// Defense in depth alongside the 25mb body limit in server.js: photos are already capped
// individually in savePhotos, but nothing stopped an attacker stuffing megabytes into a text
// field. Caps every string/array field on the way into the saved entry.
const MAX_STRING_LEN = 5000;
const MAX_ARRAY_LEN = 50;

function sanitizeFields(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_STRING_LEN);
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, MAX_ARRAY_LEN).map((v) => (typeof v === 'string' ? v.slice(0, MAX_STRING_LEN) : v));
    } else {
      out[key] = value;
    }
  }
  return out;
}

function loadSubmissions() {
  if (!existsSync(SUBMISSIONS_FILE)) return [];
  try { return JSON.parse(readFileSync(SUBMISSIONS_FILE, 'utf8')); } catch (_) { return []; }
}

function saveSubmission(entry) {
  mkdirSync(DATA_DIR, { recursive: true });
  const all = loadSubmissions();
  all.push(entry);
  writeFileSync(SUBMISSIONS_FILE, JSON.stringify(all, null, 2));
}

// Decodes and validates each data-URL photo, writes the ones that pass to disk under a
// generated (never client-supplied) filename, and returns just the saved relative paths —
// invalid/oversized/wrong-type entries are silently dropped rather than failing the submission.
function savePhotos(submissionId, photos) {
  if (!Array.isArray(photos) || !photos.length) return [];
  const dir = path.join(UPLOADS_DIR, submissionId);
  const saved = [];

  for (const photo of photos.slice(0, MAX_PHOTOS)) {
    const dataUrl = photo && photo.dataUrl;
    if (typeof dataUrl !== 'string') continue;

    const match = /^data:(image\/[a-zA-Z+]+);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
    if (!match) continue;
    const [, mime, base64] = match;
    const ext = ALLOWED_MIME_EXT[mime];
    if (!ext) continue;

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_PHOTO_BYTES) continue;

    mkdirSync(dir, { recursive: true });
    const filename = `photo-${saved.length + 1}.${ext}`;
    writeFileSync(path.join(dir, filename), buffer);
    saved.push(`uploads/${submissionId}/${filename}`);
  }

  return saved;
}

// Fire-and-forget — a notification failure shouldn't fail Michelle's submission.
function notifyAdreyn(entry) {
  const summary = [
    `New AZ home-search intake from ${entry.name || 'unknown'}.`,
    `ZIPs: ${entry.zips || '—'}`,
    `Budget: ${entry.budget_min || '?'} - ${entry.budget_max || '?'}`,
    `Timing: ${(entry.timing || []).join(', ') || '—'}`,
    `Home type: ${(entry.home_type || []).join(', ') || '—'}`,
    `Reference links included: ${entry.seen_links && entry.seen_links.trim() ? 'yes' : 'no'}`,
    `Reference photos included: ${(entry.seen_photos || []).length}`,
    '',
    'Full submission: projects/client-work/michelle-az-home/data/submissions.json',
  ].join('\n');

  execFile(
    'gws',
    ['gmail', '+send', '--to', NOTIFY_EMAIL, '--subject', 'New AZ home search intake submitted', '--body', summary],
    { timeout: 30000 },
    (err) => {
      if (err) console.error('[michelle-az-home] gmail notify failed:', err.message);
    }
  );
}

const router = express.Router();

// Serves the form directly at the bare mount path (no trailing-slash redirect hop) —
// this is a link Adreyn texts to a real person, so it should just load.
router.get('/', (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// Mounted before the dashboard's auth gate in server.js — this route (and everything
// under it) must never require Adreyn's dashboard login.
router.post('/submit', (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ ok: false, error: 'Too many submissions — try again later.' });
  }

  const body = req.body || {};
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ ok: false, error: 'name is required' });
  }

  // randomUUID, not a timestamp — this ID also names the upload directory served back to
  // Adreyn below (mounted post-auth), so it must not be guessable by anyone who isn't him.
  const id = randomUUID();
  const { seen_photos, ...rest } = sanitizeFields(body);

  let savedPhotos = [];
  try {
    savedPhotos = savePhotos(id, seen_photos);
  } catch (err) {
    console.error('[michelle-az-home] failed to save reference photos:', err.message);
  }

  const entry = { id, submitted_at: new Date().toISOString(), ...rest, seen_photos: savedPhotos };

  try {
    saveSubmission(entry);
  } catch (err) {
    console.error('[michelle-az-home] failed to save submission:', err.message);
    return res.status(500).json({ ok: false, error: 'failed to save' });
  }

  notifyAdreyn(entry);
  res.json({ ok: true });
});

router.use(express.static(path.join(__dirname, '../public')));

// Uploaded reference photos — separate router, mounted in server.js *after* the dashboard's
// auth gate. These can contain identifying photos of a real person's home search; only Adreyn
// (logged in) should ever be able to browse them, so this must never share a mount point with
// the public form/submit router above.
const adminRouter = express.Router();
adminRouter.use('/uploads', express.static(UPLOADS_DIR));

export default router;
export { adminRouter as michelleAdminRouter };
