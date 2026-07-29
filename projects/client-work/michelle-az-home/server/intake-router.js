import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFile } from 'child_process';
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

// Uploaded reference photos, served back so Adreyn can actually view them from the dashboard
// or a browser later without digging through the filesystem.
router.use('/uploads', express.static(UPLOADS_DIR));

// Mounted before the dashboard's auth gate in server.js — this route (and everything
// under it) must never require Adreyn's dashboard login.
router.post('/submit', (req, res) => {
  const body = req.body || {};
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ ok: false, error: 'name is required' });
  }

  const id = Date.now().toString(36);
  const { seen_photos, ...rest } = body;

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

export default router;
