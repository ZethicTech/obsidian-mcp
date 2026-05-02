# Releasing

This package publishes to npm via a manually-dispatched GitHub Actions workflow. Releases are intentional, not automatic.

## How to release

1. **Bump the version** in `package.json` in the same commit as the code change you are shipping. Sync `package-lock.json` if needed:

   ```bash
   npm install --package-lock-only --no-audit --no-fund
   git add package.json package-lock.json
   git commit -m "fix: ..."   # or feat:, etc.
   git push
   ```

   The push runs CI on `main` (lint, typecheck, build, test on Node 20 and 22). Make sure CI is green before continuing.

2. **Dispatch the publish workflow:**
   - GitHub → Actions → "CI & Publish" → "Run workflow" → branch `main` → leave `dry_run` unchecked → Run.
   - Or via CLI: `gh workflow run "CI & Publish" --ref main`

3. **What the workflow does** (in order):
   - Re-runs CI on Node 22.
   - Reads the version from `package.json`.
   - Verifies `vX.Y.Z` tag does not already exist (fail-fast if you forgot to bump).
   - Runs `npm publish --access public --provenance` (OIDC trusted-publisher; no NPM token needed).
   - Tags `vX.Y.Z` and pushes the tag.
   - Creates a GitHub Release with auto-generated notes from commit history since the previous tag.

## Dry-run

To validate without publishing — checks `npm pack` produces the expected tarball without touching npm, the tag, or the release page:

```bash
gh workflow run "CI & Publish" --ref main -f dry_run=true
```

## Conventional commit types

Commit prefixes drive the auto-generated GitHub Release notes (everything after the previous tag). Use:

- `feat:` — new feature
- `fix:` — bug fix
- `perf:` — performance improvement
- `refactor:` — code refactor (no behavior change)
- `docs:` — documentation only
- `chore:` — tooling, deps, repo housekeeping
- `ci:` — CI/CD changes
- `test:` — tests only
- `build:` — build-system changes

Breaking changes: append `!` to the type (`feat!: …`) and include a `BREAKING CHANGE:` paragraph in the body. Bump the major version in `package.json` accordingly.

## Semver guidance

| Change                                            | Bump  |
| ------------------------------------------------- | ----- |
| Bug fix, internal refactor, dep bump (patch)      | patch |
| New tool, new option, new env var (additive)      | minor |
| Removed/renamed tool, breaking schema, env rename | major |

## Why workflow-dispatch instead of release-please

We tried release-please. It opens a release PR per push to `main`, but:

- The release PR is created by `GITHUB_TOKEN`, so its CI never auto-triggers (GitHub guards against workflow recursion). Every release needed a close-and-reopen workaround.
- An organization-level "Allow Actions to create PRs" toggle had to be flipped before release-please could work at all.
- Bot-authored PRs can't be self-approved by the original commit author, blocking small-team merges.
- For a small package the auto-CHANGELOG churn outweighs the benefit.

`workflow_dispatch` keeps every release intentional and one click away, with no permission acrobatics.
