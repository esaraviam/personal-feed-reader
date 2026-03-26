# ADR-001: Mobile App Strategy — PWA vs Native

## Status
Superseded by [ADR-002](./ADR-002-stay-with-pwa.md)

## Context

Daily Brief is a mobile-first PWA built with React 19 + TypeScript + Vite + Zustand, deployed on Vercel at `feeds.millamanque.cl`. The app aggregates RSS feeds, ranks articles, and persists data client-side via IndexedDB. A Cloudflare Worker handles CORS proxying for RSS fetching and the Feedly search API.

The current experience is fully functional on desktop and Android. On iOS, the app runs well but has structural limitations imposed by Safari's PWA support:

- Push notifications require iOS 16.4+ **and** manual home screen installation
- No background refresh — articles only update when the app is actively open
- No App Store listing — sharing/installing requires a URL, not a store search
- No home screen badge for unread counts

The question is whether these gaps justify investing in a native mobile distribution strategy, and if so, which approach best fits the project's constraints (solo developer, client-side only, simplicity-first).

## Decision

**Enhance the PWA first. Adopt Capacitor as the native wrapper if App Store distribution or reliable push notifications become necessary.**

This is a two-phase approach:

**Phase 1 — PWA enhancement (immediate, ~1–2 days):**
- Add an explicit "Install App" prompt (`beforeinstallprompt` on Android; manual guidance on iOS)
- Integrate Web Push notifications via a Cloudflare Worker + Web Push API (covers Android fully, iOS 16.4+)

**Phase 2 — Capacitor wrapper (conditional, ~3–5 days):**
- Wrap the existing Vite build in a native WKWebView (iOS) and WebView (Android)
- Adapt the two platform-sensitive files: `useExport.ts` and the file import handler in `SettingsView.tsx`
- Submit to App Store and Google Play

Phase 2 is only triggered if Phase 1 leaves meaningful gaps in daily usage after a real evaluation period.

## Options Considered

### Option A: Keep the PWA (status quo)

- **Pros:**
  - Zero additional development effort
  - Single deployment target (Vercel)
  - Full offline support via Workbox service worker
  - `display: standalone` already configured — installs app-like on both platforms
  - No recurring platform costs

- **Cons:**
  - No App Store presence — discovery and sharing require a URL
  - Push notifications unreliable on iOS (version-gated, requires home screen install)
  - No background refresh — content only updates while app is open
  - No home screen badge (unread count)

### Option B: Capacitor wrapper ✅ *Selected for Phase 2*

Capacitor embeds the existing Vite/React build inside a native shell (WKWebView on iOS, WebView on Android). The web app runs unchanged except for two platform-specific I/O adapters.

- **Pros:**
  - ~95% code reuse — domain, store, services, i18n, and all UI components are unchanged
  - App Store distribution on iOS and Android
  - Full push notifications via `@capacitor/push-notifications`
  - Background refresh via `@capacitor/background-runner`
  - Home screen badge support
  - Low adaptation surface: only `useExport.ts` and file import need platform branching

- **Cons:**
  - Two build pipelines (web + native); requires Xcode for iOS builds
  - $99/year Apple Developer account
  - App Store review process
  - IndexedDB in WKWebView subject to iOS storage eviction under pressure (mitigated by existing JSON export feature)
  - Capacitor version upgrades add periodic maintenance overhead

### Option C: React Native (full rewrite)

- **Pros:**
  - Genuinely native UI rendering
  - Best-in-class scroll performance
  - Full access to all native APIs

- **Cons:**
  - ~80% of the codebase must be rewritten (all UI components, persistence layer)
  - Tailwind CSS and shadcn/ui have no direct RN equivalents
  - IndexedDB → SQLite migration required
  - Estimated 6–10 weeks of work
  - Highest long-term maintenance burden (two fully separate UI codebases)
  - Scroll performance advantage is irrelevant for a headline-list use case

### Option D: Expo (web + native code sharing)

- **Pros:**
  - Theoretical single codebase for web and native

- **Cons:**
  - NativeWind v4 is still maturing — significant Tailwind coverage gaps
  - No shadcn/ui equivalent for React Native
  - Code sharing requires conditional rendering at most component boundaries
  - Complexity exceeds benefit for this app's scope

## Rationale

The app's domain layer (`types.ts`, `aggregator.ts`, `ranking.ts`, `recommendations.ts`, `db.ts`, store) contains no browser-specific APIs. Data persistence (IndexedDB via `idb`), networking (`fetch()` + CF Worker), and XML parsing (`fast-xml-parser`) all run unchanged inside a Capacitor WebView.

The only genuinely platform-sensitive code is file I/O:
- **Export:** `URL.createObjectURL` + `<a download>` → `@capacitor/filesystem` + `@capacitor/share`
- **Import:** `<input type="file">` → `FilePicker` on native (or unchanged if WKWebView handles it adequately)

This is a 2-file adaptation, not an architectural migration. The low coupling between the domain, state, and UI layers — which was intentional in the original design — makes Capacitor the natural path if native is needed.

React Native was ruled out because the primary user action (scrolling a ranked list of headlines) does not benefit meaningfully from native rendering. The rewrite cost is disproportionate to the UX gain for this specific use case.

The phased approach is preferred because the PWA already delivers the core value. Investing in native before validating that the remaining gaps are truly painful would be premature optimization.

## Consequences

### Positive
- Phase 1 closes the Android push notification gap at near-zero cost
- Phase 2, if triggered, produces App Store presence with minimal code change
- The existing JSON export/import feature mitigates IndexedDB eviction risk on iOS
- The architecture remains maintainable by a solo developer throughout both phases

### Negative
- Phase 2 introduces a second build pipeline requiring Xcode (macOS required for iOS builds)
- App Store submission adds review latency to the release cycle
- Cloudflare Worker proxy remains a single point of failure for RSS fetching in both phases
- Web Push on iOS remains unreliable below iOS 16.4 regardless of approach

### Neutral / Watch
- IndexedDB data in WKWebView is scoped to the WebView origin and can be evicted under storage pressure. The existing JSON backup export mitigates data loss risk. Monitor if this becomes a real issue in production.
- Apple's PWA support trajectory may reduce the gap between PWA and native over time. Re-evaluate if Safari gains reliable background push before Phase 2 is triggered.

## Adaptation Plan (Phase 2)

| File | Change Required |
|---|---|
| `src/hooks/useExport.ts` | Platform-branch: `Capacitor.isNativePlatform()` → use `Filesystem.writeFile` + `Share.share` instead of blob download |
| `src/views/SettingsView.tsx` | File import: test WKWebView `<input type="file">` behavior; swap for `@capacitor/filesystem` picker if needed |
| `vite.config.ts` | Disable `VitePWA` plugin when building for native (`VITE_TARGET=native` env flag) |
| `capacitor.config.ts` | New file: app ID, app name, webDir, server config |
| `ios/` + `android/` | Generated native project directories (gitignored except config) |

All other files — domain types, store, services, hooks, components, i18n — require zero changes.

**New Capacitor plugins required:**
- `@capacitor/core`
- `@capacitor/ios` / `@capacitor/android`
- `@capacitor/filesystem`
- `@capacitor/share`
- `@capacitor/push-notifications` (Phase 2 only if push is added)
- `@capacitor/background-runner` (Phase 2 only if background refresh is added)

## References

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Web Push API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Apple PWA support matrix (iOS 16.4+)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Workbox Service Worker config — `vite.config.ts`](../../vite.config.ts)
- [File export implementation — `src/hooks/useExport.ts`](../../src/hooks/useExport.ts)
- [File import implementation — `src/views/SettingsView.tsx`](../../src/views/SettingsView.tsx)
