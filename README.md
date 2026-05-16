# Agent Reports

General static reporting system for QA AI agents.

## Create a report

```bash
bun run new -- login-smoke "Login smoke test"
```

This creates:

```text
reports/login-smoke/
  meta.json
  index.html
  assets/
```

## Fill the report

1. Put sanitized screenshots, videos, logs, and artifacts in `assets/`.
2. Update `meta.json` with title, date, status, summary, target, tags, entry, and author.
3. Update `index.html` with findings, expected/observed behavior, commands, environment, verdict, next actions, and the required secrets/auth-state note.

## Validate and preview

```bash
bun run restyle:check
bun run build
bun run serve
```

Preview at:

```text
http://localhost:8000
```

## Rules

- Reports live under `reports/<run-slug>/`.
- Do not commit `dist/`.
- Do not copy secrets, cookies, storage state, JWTs, bearer tokens, passwords, private keys, `.env` files, or PII.
- Keep the managed CSS markers in each report HTML.
