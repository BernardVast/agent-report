import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE_END, BASE_START, REPORTS_ROOT, ensureDirs, escapeHtml, exists, readBaseCss, slugify } from './lib.mjs';

const args = process.argv.slice(2);
const positional = [];
const flags = {};
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, raw = 'true'] = arg.slice(2).split('=');
    flags[key] = raw;
  } else {
    positional.push(arg);
  }
}

const slug = slugify(positional[0] || '');
const title = positional[1] || '';
if (!slug || !title) {
  console.error('Usage: bun run new -- <run-slug> "Run title" [--series=slug --round=1 --previous=prior-run]');
  process.exit(1);
}
if (/^\d{4}-\d{2}-\d{2}/.test(slug)) {
  console.error('Run slugs must not be date-stamped. Put dates in meta.json.');
  process.exit(1);
}

await ensureDirs();
const runDir = path.join(REPORTS_ROOT, slug);
if (await exists(runDir)) {
  console.error(`Report already exists: reports/${slug}`);
  process.exit(1);
}
await fs.mkdir(path.join(runDir, 'assets'), { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const meta = {
  title,
  date: today,
  status: 'unknown',
  summary: 'Replace this with one to three plain-text sentences summarizing the QA test and headline result.',
  target: 'Application or feature under test',
  tags: ['manual'],
  entry: 'index.html',
  author: { name: 'QA Agent' },
};
if (flags.series || flags.round || flags.previous) {
  meta.series = {
    slug: flags.series || slug.replace(/-r\d+$/, ''),
    title: flags.seriesTitle || title.replace(/\s+[—-]\s+round\s+\d+$/i, ''),
    round: Number(flags.round || 1),
  };
  if (flags.previous) meta.series.previous = flags.previous;
}
await fs.writeFile(path.join(runDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

const baseCss = await readBaseCss();
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Agent Reports</title>
  <style>
${BASE_START}
${baseCss}
${BASE_END}
  </style>
</head>
<body>
  <main class="page">
    <nav class="nav" aria-label="Report navigation">
      <a class="brand" href="../../index.html"><span class="logo">QA</span><strong>Agent Reports</strong></a>
      <div class="nav-links">
        <a href="../../index.html">Dashboard</a>
      </div>
    </nav>

    <header class="hero">
      <p class="eyebrow">QA evaluation report</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">Replace this lead with a concise summary of the tested flow, evidence captured, and headline result.</p>
      <p class="meta-line">Target: Application or feature under test · Date: ${today} · Author: QA Agent</p>
      <span class="pill unknown">unknown</span>
    </header>

    <section class="stats" aria-label="Report stats">
      <div class="stat"><span class="big-number">0</span><span>Fail findings</span></div>
      <div class="stat"><span class="big-number">0</span><span>Warn findings</span></div>
      <div class="stat"><span class="big-number">0</span><span>Pass checks</span></div>
      <div class="stat"><span class="big-number">0</span><span>Evidence files</span></div>
    </section>

    <section class="panel panel-accent">
      <h2>Headline result</h2>
      <p>State the verdict in plain language. Note whether the flow passed, partially passed, failed, was fixed, or remains unknown.</p>
    </section>

    <section class="panel">
      <h2>Walkthrough and evidence</h2>
      <p>Add screenshots, videos, logs, and sanitized artifacts from <code>assets/</code>.</p>
      <figure>
        <img class="shot" src="assets/placeholder.svg" alt="Placeholder evidence image">
        <figcaption>Replace this placeholder with actual evidence captured during the QA run.</figcaption>
      </figure>
    </section>

    <section class="panel">
      <h2>Findings</h2>
      <article class="issue sev-warn">
        <h3>Replace with finding title</h3>
        <p><strong>Expected:</strong> Describe expected behavior.</p>
        <p><strong>Observed:</strong> Describe observed behavior.</p>
        <p><strong>Next action:</strong> Describe the smallest useful follow-up.</p>
      </article>
    </section>

    <section class="panel">
      <h2>Reproducing</h2>
      <dl class="kv">
        <dt>Environment</dt><dd>Document the environment, URL, branch, build, or app version under test.</dd>
        <dt>Data setup</dt><dd>Document fixture, account, or state assumptions without secrets.</dd>
        <dt>Commands</dt><dd>List commands run during the test.</dd>
      </dl>
      <pre><code># Example
# Start the app, run tests, capture evidence, and record exact commands here.</code></pre>
    </section>

    <section class="panel panel-good">
      <h2>Secrets and auth-state note</h2>
      <p>No secrets, cookies, storage state, passwords, JWTs, bearer tokens, private keys, or PII were copied into this report. If authenticated testing was used, auth state stayed outside the report archive.</p>
    </section>
  </main>
</body>
</html>
`;
await fs.writeFile(path.join(runDir, 'index.html'), html);
await fs.writeFile(path.join(runDir, 'assets', 'placeholder.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Placeholder evidence">
  <rect width="1200" height="720" fill="#fffdf7"/>
  <rect x="40" y="40" width="1120" height="640" rx="32" fill="#f1ead8" stroke="#ded8c6"/>
  <text x="600" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#2f6f4e">Evidence placeholder</text>
  <text x="600" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#687266">Replace with sanitized screenshots, videos, or logs</text>
</svg>
`);
console.log(`Created reports/${slug}`);
