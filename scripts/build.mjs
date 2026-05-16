import fs from 'node:fs/promises';
import path from 'node:path';
import { DIST, REPORTS_ROOT, copyDir, ensureDirs, escapeHtml, listReports, readBaseCss, validateMeta } from './lib.mjs';

await ensureDirs();
await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

const reports = await listReports();
const errors = [];
for (const report of reports) errors.push(...validateMeta(report.meta, report.slug));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

await copyDir(REPORTS_ROOT, path.join(DIST, 'reports'));

const counts = reports.reduce((acc, report) => {
  const status = report.meta.status || 'unknown';
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});
const baseCss = await readBaseCss();
const cards = reports.length
  ? reports.map(({ slug, meta }) => {
      const tags = Array.isArray(meta.tags) ? meta.tags : [];
      return `<a class="report-card" href="reports/${escapeHtml(slug)}/index.html">
        <span class="pill ${escapeHtml(meta.status)}">${escapeHtml(meta.status)}</span>
        <h2>${escapeHtml(meta.title)}</h2>
        <p>${escapeHtml(meta.summary)}</p>
        <p class="meta-line">${escapeHtml(meta.date)} · ${escapeHtml(meta.target)}</p>
        <div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </a>`;
    }).join('\n')
  : `<div class="panel empty-state"><h2>No reports yet</h2><p>Create one with <code>bun run new -- smoke-test "Smoke test"</code>.</p></div>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Reports</title>
  <style>${baseCss}</style>
</head>
<body>
  <main class="page">
    <nav class="nav" aria-label="Dashboard navigation">
      <a class="brand" href="index.html"><span class="logo">QA</span><strong>Agent Reports</strong></a>
      <div class="nav-links">
        <a href="skill.md">Agent guide</a>
      </div>
    </nav>

    <header class="hero">
      <p class="eyebrow">QA agent reporting system</p>
      <h1>General QA evaluation dashboard</h1>
      <p class="lead">A static archive for AI QA agents to publish self-contained HTML findings, sanitized evidence, reproduction notes, and status metadata for any app or workflow.</p>
      <p class="meta-line">Canonical path: <code>reports/&lt;run-slug&gt;/</code></p>
    </header>

    <section class="stats" aria-label="Dashboard stats">
      <div class="stat"><span class="big-number">${reports.length}</span><span>Total reports</span></div>
      <div class="stat"><span class="big-number">${counts.pass || 0}</span><span>Pass</span></div>
      <div class="stat"><span class="big-number">${counts.partial || 0}</span><span>Partial</span></div>
      <div class="stat"><span class="big-number">${counts.fail || 0}</span><span>Fail</span></div>
    </section>

    <section class="panel panel-accent">
      <h2>How QA agents add a report</h2>
      <pre><code>bun run new -- &lt;run-slug&gt; "Run title"
# Add sanitized evidence to reports/&lt;run-slug&gt;/assets/
# Fill meta.json and index.html
bun run restyle:check
bun run build
bun run serve</code></pre>
    </section>

    <section class="reports-grid" aria-label="Reports">
      ${cards}
    </section>
  </main>
</body>
</html>
`;
await fs.writeFile(path.join(DIST, 'index.html'), html);
await fs.copyFile(path.join(process.cwd(), 'skill.md'), path.join(DIST, 'skill.md'));
console.log(`Built dist with ${reports.length} report${reports.length === 1 ? '' : 's'}.`);
