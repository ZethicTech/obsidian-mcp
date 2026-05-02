# Releasing

This package publishes to npm via a manually-dispatched GitHub Actions workflow. Releases are intentional, not automatic.

## How to release

1. **Bump the version** in `package.json` in the same commit as the code change you are shipping. Sync `package-lock.json`:

   ```bash
   # 1. Edit code
   # 2. Edit package.json: bump "version" per semver guidance below
   npm install --package-lock-only --no-audit --no-fund
   git add <your-code-files> package.json package-lock.json
   git commit -m "fix: ..."   # or feat:, refactor:, etc. — see "Conventional commit types"
   git push
   ```

   The push runs CI on `main` (lint, format check, typecheck, build, test on Node 20 and 22). Make sure CI is green before continuing.

2. **Dispatch the publish workflow:**
   - GitHub → Actions → "CI & Publish" → "Run workflow" → branch `main` → leave `dry_run` unchecked → Run.
   - Or via CLI: `gh workflow run "CI & Publish" --ref main`

3. **What the workflow does** (in order):
   - Waits for the `ci` matrix (Node 20 and Node 22) to pass — both legs are gating.
   - Sets up Node 22 on the publish runner and `npm ci` + `npm run build`.
   - Reads version from `package.json` via `jq -r .version` (with empty/null guard).
   - Verifies `vX.Y.Z` tag does not already exist on the remote (fail-fast if you forgot to bump).
   - Runs `npx -y npm@latest publish --access public --provenance`. The `npx` wrapper is load-bearing — the runner's bundled npm 10.x has been observed to fail OIDC trusted-publisher auth (PUT 404 against npmjs.com despite valid sigstore signature). Going through `npx` pulls a fresh npm@latest that handles trusted publishing correctly. Don't "simplify" back to bare `npm publish`.
   - Tags `vX.Y.Z` and pushes the tag.
   - Creates a GitHub Release with auto-generated notes from commit history since the previous tag.

   No `NPM_TOKEN` secret is used — npmjs.com is configured with a trusted publisher pointing at `.github/workflows/publish.yml` in this repo, and the workflow grants `id-token: write` for OIDC.

## Dry-run

To validate without publishing — runs `npx -y npm@latest pack` (so the tarball is built and the OIDC + npx path are exercised), but skips `npm publish`, tagging, and the GitHub Release:

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
