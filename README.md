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

## Build local installers (unsigned)

```bash
npm run dist:mac   # → dist/Pipelane-<version>.dmg + .zip (arm64 + x64)
npm run dist:win   # → dist/Pipelane Setup <version>.exe
```

Builds are unsigned for v1. Code signing for macOS (Developer ID + notarisation) and Windows (EV cert) is a follow-up — Gatekeeper / SmartScreen will warn on first launch until then.

## Release (publishes to GitHub)

```bash
GH_TOKEN=<token-with-repo-write> npm run release
```

This builds for macOS + Windows and publishes artefacts to a draft GitHub Release in `pa-tech-labs/pipelane-desktop`. The `electron-updater` clients in already-installed copies will pick it up once the draft is promoted to "Latest".

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
