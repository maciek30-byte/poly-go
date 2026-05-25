# Commit & Branch Conventions

## Commit messages — Conventional Commits

Format: `<type>(<optional-scope>): <subject>`

Enforced by `.husky/commit-msg`. Merge/revert/fixup commits are exempt.

- **type** — `feat | fix | chore | docs | refactor | test | ci | build | perf | style | revert`
- **scope** — optional, lowercase, kebab-case (e.g. `auth`, `chat`, `directory`, `deploy`)
- **subject** — lowercase, imperative ("add" not "added"/"adds"), no trailing period, ≤ 72 chars
- **body** — optional, separated from subject by a blank line

Examples:

```
feat(directory): gate company search on activated state
fix(chat): preserve thread history on employee deactivation
chore: bump wrangler to 4.93.1
docs(runbook): add rollback steps
```

## Branch names

Format: `<type>/<short-kebab-slug>` — documented convention, not enforced by a hook.

- **type** — same set as commits, plus `hotfix`
- **slug** — lowercase, hyphen-separated, ≤ 50 chars
- `main` is exempt

Examples:

```
feat/directory-search
fix/chat-history-leak
chore/wrangler-v4-bump
hotfix/auth-redirect-loop
```
