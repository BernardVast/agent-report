import fs from 'node:fs/promises';
import path from 'node:path';

export const ROOT = process.cwd();
export const REPORTS_ROOT = path.join(ROOT, 'reports');
export const DIST = path.join(ROOT, 'dist');
export const BASE_START = '/* @agent-reports:base-start — managed by scripts/restyle.mjs */';
export const BASE_END = '/* @agent-reports:base-end */';

export async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function ensureDirs() {
  await fs.mkdir(REPORTS_ROOT, { recursive: true });
}

export async function readBaseCss() {
  return fs.readFile(path.join(ROOT, 'styles', 'base.css'), 'utf8');
}

export async function copyDir(src, dest) {
  if (!(await exists(src))) return;
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

export async function listReports() {
  await ensureDirs();
  const dirs = await fs.readdir(REPORTS_ROOT, { withFileTypes: true });
  const reports = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const runDir = path.join(REPORTS_ROOT, dir.name);
    const metaPath = path.join(runDir, 'meta.json');
    const indexPath = path.join(runDir, 'index.html');
    if (!(await exists(metaPath)) || !(await exists(indexPath))) continue;
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    reports.push({ slug: dir.name, meta });
  }
  reports.sort((a, b) => String(b.meta.date || '').localeCompare(String(a.meta.date || '')) || a.slug.localeCompare(b.slug));
  return reports;
}

export function validateMeta(meta, slug) {
  const errors = [];
  for (const key of ['title', 'date', 'status', 'summary', 'target', 'tags', 'entry', 'author']) {
    if (meta[key] === undefined || meta[key] === '') errors.push(`${slug}: meta.json missing ${key}`);
  }
  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) errors.push(`${slug}: date must be YYYY-MM-DD`);
  if (meta.status && !['pass', 'partial', 'fail', 'fixed', 'unknown'].includes(meta.status)) errors.push(`${slug}: invalid status ${meta.status}`);
  if (meta.tags && !Array.isArray(meta.tags)) errors.push(`${slug}: tags must be an array`);
  if (meta.entry && meta.entry !== 'index.html') errors.push(`${slug}: entry must be index.html`);
  return errors;
}
