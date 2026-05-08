# Pipelane Desktop

Native desktop shell for [pipelane.app](https://pipelane.app), targeting macOS and Windows.

The app is a thin Electron wrapper around the existing web app: it loads `https://pipelane.app` in a `BrowserWindow` and exposes a small `window.pipelaneDesktop` bridge for native features (notifications, dock badge, device id).

## What's included

- **Single-instance lock** — opening the app twice focuses the existing window.
- **Persisted window bounds** — position, size, and maximised state restore between launches (via `electron-store`).
- **External link handling** — anything outside `pipelane.app` opens in the user's default browser.
- **Custom user agent** — appends `PipelaneDesktop/<version>` so the web app can detect desktop installs.
- **Device fingerprint header** — sends `X-Device-Id` (hashed `node-machine-id`) on all requests.
- **Native notifications** — web app calls `pipelaneDesktop.notify({ title, body, data })`; click focuses the window and posts back to the renderer.
- **macOS dock badge** — `pipelaneDesktop.setBadgeCount(n)`.
- **Auto-updates** — `electron-updater` against GitHub Releases (`pa-tech-labs/pipelane-desktop`). Checks 10 s after launch and every 4 h.

## Requirements

- Node 18+ (Node 20 LTS recommended)
- npm 9+ (or pnpm if you prefer)

## Install

```bash
npm install
# or: pnpm install
```

## Develop

```bash
npm run dev
```

This compiles TypeScript in watch mode and launches Electron with `electronmon`, which restarts the main process when files in `out/` change. The window loads `https://pipelane.app`. Auto-updates are skipped in development (`NODE_ENV=development`).

## Type-check

```bash
npm run typecheck
```

## Build local installers (unsigned, no publish)

```bash
npm run dist:mac   # → dist/Pipelane-<version>-mac-{arm64,x64}.{dmg,zip}
npm run dist:win   # → dist/Pipelane-Setup-<version>-x64.exe
```

These produce installers in `dist/` but don't upload anything. Use them for smoke-testing a build locally.

## Releasing

Releases are cut from a tag — pushing `v<semver>` triggers `.github/workflows/release.yml`, which builds Mac + Windows installers in parallel on macOS and Windows runners and uploads them to a **draft** GitHub Release.

### Cutting a release

```bash
# On a clean main with the changes you want to ship:
npm version patch          # bumps package.json + creates a v<x.y.z> tag
git push --follow-tags origin main

# Wait for the Actions run to complete (~10–15 min for both platforms).
# Then on https://github.com/pa-tech-labs/pipelane-desktop/releases:
#   - Review the auto-generated release notes
#   - Edit if needed
#   - Click "Publish release" to flip it from draft → published
```

`electron-updater` clients only pick up *published* releases, so the draft step is a manual gate before users get auto-update prompts.

### Why drafts (not auto-published)

Auto-publishing means a typo in a tag immediately ships to every installed copy. Drafts give you a chance to bin a botched build before users see it. Trade-off: every release costs one extra click.

### Local releases (manual)

If GitHub Actions is unavailable and you need to ship from a workstation:

```bash
GH_TOKEN=<token-with-repo-write> npm run release
```

This builds Mac + Windows from the same machine (Windows builds via electron-builder's cross-compilation may not work on Apple Silicon — prefer the CI path).

## Code signing

**v1 ships unsigned.** Until certs are configured, end users see OS-level warnings:

- **macOS** — first launch fails with "Pipelane can't be opened because the developer cannot be verified." Workaround: right-click the app → **Open** → confirm in the dialog. Or System Settings → Privacy & Security → **Open Anyway** under the warning. After the first acceptance, future launches work normally.
- **Windows** — SmartScreen blocks the installer with "Windows protected your PC." Workaround: click **More info** → **Run anyway**.

These go away once signing is wired up. The release workflow is already plumbed for it — it just needs the secrets set on the GitHub repo:

| Platform | Required secrets |
|---|---|
| macOS (sign + notarise) | `MAC_CERTIFICATE_BASE64`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` |
| Windows (sign) | `WIN_CERTIFICATE_BASE64`, `WIN_CERTIFICATE_PASSWORD` |

When all secrets in a row are set, that platform's installer ships signed. When they're missing, electron-builder logs a warning and ships unsigned — the workflow doesn't fail. Mac requires both an Apple Developer ID Application certificate *and* an Apple Developer account for notarisation; Windows works with an EV or OV code-signing cert.

## Project layout

```
src/
  main/
    index.ts          # Main process entry, single-instance lock, session config
    window.ts         # Window creation + persisted bounds, macOS hide-on-close
    preload.ts        # contextBridge — exposes window.pipelaneDesktop
    notifications.ts  # IPC handlers for native notifications + dock badge
    updater.ts        # electron-updater wiring
  types/
    bridge.ts         # Shared types for the window.pipelaneDesktop surface
electron-builder.yml  # Packaging targets + GitHub publish config
tsconfig.json
package.json
```

Compiled output goes to `out/`; packaged installers go to `dist/`.

## Bridge API

The web app can detect and use the desktop bridge like so:

```ts
if (window.pipelaneDesktop?.isDesktop) {
  const { version, platform, notify, setBadgeCount, onNotificationClick } = window.pipelaneDesktop;

  notify({ title: 'New revision', body: 'PA Media uploaded a revision', data: { jobId: 'PL-0042' } });
  setBadgeCount(3);
  const off = onNotificationClick(data => {
    // navigate to data.jobId, etc.
  });
  // call off() when unmounting
}
```

## Not included yet

These are tracked as separate tasks:

- Server-side validation of `X-Device-Id` (pipelane backend).
- Realtime → `pipelaneDesktop.notify(...)` dispatch in the web app.
- GitHub Actions release workflow (currently `npm run release` runs locally).
- Code signing + notarisation for both platforms.
