---
name: fix-build
description: Fix a failed gate (typecheck, lint, build or check:site) using the pasted output. Used by the pipeline retry loop.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# /fix-build

The gate output is in `$ARGUMENTS` (or `.artifacts/gate-output.txt` if empty). Fix the cause with the smallest change, then rerun the failed gate and everything after it.

- Do not "fix" a failure by removing a page, section, image or feature the brief asked for. Fix the content.
- Files that are not yours (see `CLAUDE.md`): if the failure is inside one, the fix is in how a page uses it.
- Placeholder failures: rewrite the flagged text with specific copy from the brief.
- Alt text failures: describe the photo (the brief's `alt`/`caption` helps).
- axe failures: fix the markup (heading order, button vs link, label association); contrast is fixed in `design/active.ts`.
- Console errors: usually a missing `key`, an image without dimensions, or a client component importing server code.

After the gates pass, append a short "Fixes" list to `BUILD_NOTES.md` and stop.
