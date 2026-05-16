import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE_END, BASE_START, REPORTS_ROOT, ensureDirs, exists, listReports, validateMeta } from './lib.mjs';

await ensureDirs();
const errors = [];
const reports = await listReports();

for (const { slug, meta } of reports) {
  const runDir = path.join(REPORTS_ROOT, slug);
  errors.push(...validateMeta(meta, slug));
  const html = await fs.readFile(path.join(runDir, 'index.html'), 'utf8');
  if (!html.includes(BASE_START) || !html.includes(BASE_END)) {
    errors.push(`${slug}: index.html is missing managed base CSS markers`);
  }
  if (html.includes('<script')) {
    errors.push(`${slug}: reports must not add scripts`);
  }
  if (/href=["'](?:\.\.\/)?style\.css["']/.test(html)) {
    errors.push(`${slug}: must not import root style.css`);
  }
  const assets = path.join(runDir, 'assets');
  if (!(await exists(assets))) errors.push(`${slug}: missing assets/ directory`);
}

if (errors.length) {
  console.error('Restyle check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Restyle check passed (${reports.length} report${reports.length === 1 ? '' : 's'}).`);
