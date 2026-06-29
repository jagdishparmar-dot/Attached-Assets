---
name: EAS builds on Replit sandbox
description: How to run `eas build` from this repo without hitting the sandbox git guard
---

# Running `eas build` in the Replit sandbox

`eas build` fails by default in the Replit environment (both main agent and task
agents) with: `Destructive git operations are not allowed in the main agent ... /home/runner/workspace/.git/index.lock`.

**Cause:** eas-cli's default `GitClient` snapshots the working tree by running
`git add -A` / `git add --intent-to-add` / `git commit`, all of which try to write
`.git/index.lock`. The Replit sandbox guards `.git/` and blocks any write to it
(you cannot even `rm -f .git/index.lock` from bash — that is blocked too).

**Fix:** set `EAS_NO_VCS=1`. This makes eas-cli use `NoVcsClient`, which only runs a
read-only `git rev-parse --show-toplevel` and otherwise tars the project directory
directly — no destructive git ops. Command that works:

```
cd artifacts/mobile && EAS_NO_VCS=1 ./node_modules/.bin/eas build \
  --platform android --profile production --non-interactive --no-wait
```

**Why:** the build only needs the project files uploaded; git history is irrelevant
to the EAS build. NoVcs mode prints a harmless "not recommended" warning to stderr.

**How to apply:** any `eas build` / `eas update` triggered from this repo must export
`EAS_NO_VCS=1`. Auth is via the `EXPO_TOKEN` secret (no interactive login). Optional:
`EAS_SKIP_AUTO_FINGERPRINT=1` to skip the slow fingerprint step.
