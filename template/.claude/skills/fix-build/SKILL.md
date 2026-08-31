---
name: fix-build
description: Fix a failed gate (typecheck, lint, build or check:site) using the pasted output. Used by the pipeline retry loop.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(pnpm typecheck*), Bash(pnpm lint*), Bash(pnpm build*), Bash(pnpm check:site*), Bash(pnpm db:seed*), Bash(git status*), Bash(git diff*)
---

# /fix-build

The gate output is in `$ARGUMENTS` (or `.artifacts/gate-output.txt` if empty). Fix the cause with the smallest change that respects `CLAUDE.md`, then rerun the failed gate and everything after it.

Rules:
- Do not "fix" a failure by removing a page, section, image or feature the brief asked for. Fix the content.
- Do not edit protected files (see `CLAUDE.md` §6). If the failure is inside one, the fix is in how a page uses it.
- Placeholder failures: rewrite the flagged text with specific copy from the brief.
- Alt text failures: write a specific description of the photo (use the brief's `alt`/`caption`).
- axe failures: fix the markup (heading order, button vs link, label association, contrast is a design-system bug — report it in `BUILD_NOTES.md`, do not override tokens).
- Type errors from section props: read the section's props type in `components/sections/<Name>.tsx` and conform.
- Console errors: usually a missing `key`, an image without dimensions, or a client component importing server code.

After the gates pass, append a short "Fixes" list to `BUILD_NOTES.md` and stop.
