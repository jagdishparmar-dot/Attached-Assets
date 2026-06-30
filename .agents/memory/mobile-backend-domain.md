---
name: Mobile production backend domain
description: How the Coldverse mobile app discovers its backend in installed/release builds
---

# Mobile production backend URL

Installed (release) builds of the Coldverse driver app resolve their API/auth host
from the `EXPO_PUBLIC_DOMAIN` env var (read in `AuthContext.getApiBase`, native only;
web falls back to relative URLs). If unset, release builds have NO backend and cannot
log in or load data.

**Rule:** `EXPO_PUBLIC_DOMAIN` must exist as a Plain-text var in the EAS **production**
environment, set to the published Replit deployment domain (the `*.replit.app` host
from `getDeploymentInfo().primaryUrl`), value WITHOUT the `https://` prefix
(getApiBase prepends it). Never use a `*.replit.dev` dev domain.

**Why:** EAS build env is separate from the Replit container env; EXPO_PUBLIC_* vars
are inlined at build time. A build with no production-env vars warns
"No environment variables ... found for the production environment on EAS" and ships
with an empty backend.

**How to apply:** before any production Android/iOS build, confirm with
`EAS_NO_VCS=1 eas env:list production`; create with
`eas env:create production --name EXPO_PUBLIC_DOMAIN --value <host> --visibility plaintext --type string`.

Note: `--auto-submit` for Android fails in the isolated task-agent env because
`google-play-service-account.json` is gitignored and only present in the user's main
checkout — the build itself still runs; submit must be done where the key exists.
