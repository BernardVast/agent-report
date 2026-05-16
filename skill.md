# Agent Reports · QA agent skill · add an evaluation report

Use this skill whenever an AI QA agent finishes a test, evaluation, audit, smoke test, or regression run and needs to publish findings.

The goal is to deposit self-contained HTML reports and sanitized raw artifacts in a general QA evaluation dashboard without leaking secrets or drifting from the shared visual system.

## Layout

Every report goes here:

```text
reports/<run-slug>/
```

Each run contains:

```text
meta.json
index.html
assets/
```

## Scaffold a report

From the report archive root:

```bash
bun run new -- <run-slug> "Run title"
```

Examples:

```bash
bun run new -- login-smoke "Login smoke test"
bun run new -- upload-flow-r1 "Upload flow — round 1" --series=upload-flow --round=1
bun run new -- upload-flow-r2 "Upload flow — round 2" --series=upload-flow --round=2 --previous=upload-flow-r1
```

## Fill in meta.json

Required fields:

```json
{
  "title": "Upload flow",
  "date": "2026-05-16",
  "status": "partial",
  "summary": "Plain-text summary of the flow tested and the headline result.",
  "target": "http://localhost:3000/upload",
  "tags": ["e2e", "upload"],
  "entry": "index.html",
  "author": "qa-agent"
}
```

Allowed statuses:

- `pass`
- `partial`
- `fail`
- `fixed`
- `unknown`

## Write the report HTML

Reports are self-contained HTML. They may reference their own local `assets/` files only.

Do not add external scripts or depend on root CSS files. The base stylesheet is inlined between managed markers:

```css
/* @agent-reports:base-start — managed by scripts/restyle.mjs */
/* @agent-reports:base-end */
```

Do not delete or rename those markers.

Minimum report content:

1. target environment and branch/commit/version if known
2. commands run
3. data setup / account assumptions
4. expected behavior
5. observed behavior
6. screenshots/videos/logs
7. verdict and next actions
8. explicit note that secrets/auth state were not copied

Asset references must be relative to the run directory:

```html
<img src="assets/01-upload-form.png" alt="Upload form with validation error">
<video src="assets/walkthrough.webm" controls preload="metadata"></video>
```

## Evidence rules

- Put screenshots, videos, logs, traces, and sanitized artifacts under `assets/`.
- Prefer PNG screenshots.
- Name screenshots like `NN-short-kebab.png`, e.g. `01-login-form.png`.
- Do not commit persistent browser profiles, exported auth state, cookies, storage-state JSON, tokens, credentials, or PII.
- Secret-dependent commands must use environment variable placeholders, never inline values.

## Build and preview

```bash
bun run restyle:check
bun run build
bun run serve
```

Preview:

```text
http://localhost:8000
```

## Done checklist

- Report path is `reports/<run-slug>/`.
- `meta.json` has title/date/status/summary/target/tags/entry/author.
- `index.html` is self-contained and uses only local `assets/`.
- Evidence is sanitized.
- No `.env`, auth state, cookies, passwords, JWTs, bearer tokens, private keys, or PII are present.
- `bun run restyle:check` passes.
- `bun run build` passes.
