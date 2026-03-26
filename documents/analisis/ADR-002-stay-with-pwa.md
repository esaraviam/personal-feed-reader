# ADR-002: Retain PWA Architecture — No Native Migration

## Status
Accepted

## Context

Following the analysis documented in [ADR-001](./ADR-001-mobile-app-strategy.md), four distribution strategies were evaluated for Daily Brief:

1. Keep the PWA (status quo)
2. Capacitor wrapper (native WebView shell)
3. React Native (full rewrite)
4. Expo (web + native code sharing)

ADR-001 concluded that Capacitor was the most viable native path if App Store distribution or reliable push notifications became necessary, but recommended a phased approach: enhance the PWA first, then reassess.

This ADR records the outcome of that reassessment: the decision to remain with the PWA architecture and not pursue any native migration at this stage.

**Current app profile at time of decision:**

| Attribute | Value |
|---|---|
| Stack | React 19 + TypeScript + Vite + Zustand + Tailwind |
| Deployment | Vercel (automatic on push to `main`) |
| Persistence | IndexedDB via `idb` |
| Offline | Workbox service worker (cache-first shell, 24h RSS cache) |
| Distribution | Web URL (`feeds.millamanque.cl`) |
| Developer count | 1 (solo) |
| Backend | None (Cloudflare Worker as CORS proxy only) |
| Test coverage | 111 tests across 11 files |

## Decision

**The application will remain a PWA. No migration to Capacitor, React Native, or any native framework will be pursued at this time.**

ADR-001's Phase 1 (PWA enhancement) is the only near-term investment considered: an install prompt and optional Web Push integration. These are additive improvements within the existing architecture, not a platform change.

## Options Considered

### Option A: Migrate to Capacitor
*(Evaluated and deferred in ADR-001)*

- **Pros:** App Store presence, reliable push notifications, background refresh
- **Cons:** Second build pipeline, $99/year Apple account, Xcode dependency, App Store review latency, 2-file adaptation required, ongoing native maintenance overhead

### Option B: React Native rewrite

- **Pros:** Fully native rendering, best-in-class performance
- **Cons:** ~80% codebase rewrite, 6–10 weeks effort, two separate UI codebases indefinitely, disproportionate to the use case (scrolling a headline list)

### Option C: Retain PWA ✅ *Selected*

- **Pros:** Zero migration cost, single deployment target, full test coverage retained, Workbox already provides offline, `display: standalone` already delivers app-like UX on both platforms
- **Cons:** iOS push notifications limited to 16.4+, no App Store listing, no background refresh, no home screen badge

## Rationale

### 1. Requirements are already met

The app's core use case — open, read ranked headlines, tap through to articles — works reliably on both iOS and Android today. The Workbox service worker provides offline reading. IndexedDB persists feeds, categories, and articles across sessions. The `display: standalone` manifest entry delivers a full-screen, chrome-free experience when installed to the home screen.

None of the missing native features (push notifications, background sync, App Store listing, badge count) are blocking day-to-day usage.

### 2. Maintenance cost is prohibitive for the team size

With a single developer, maintaining two build targets (web + native) doubles the surface area for every future change. App Store submissions add unpredictable review delays to the release cycle. Xcode dependency means iOS builds are machine-locked to macOS. These costs are disproportionate to the current user base and distribution requirements.

### 3. No distribution pressure

The app is deployed at a known URL and does not require App Store discovery. Users are directed to the app directly. There is no viral growth strategy, paid acquisition funnel, or enterprise distribution requirement that would justify App Store presence at this stage.

### 4. The PWA platform is improving

Apple has been progressively improving PWA support in Safari: Web Push arrived in iOS 16.4, the Web Share API is mature, and service worker capabilities continue to expand. The gap between PWA and native is narrowing. Migrating now would lock in complexity that the platform may resolve naturally.

### 5. Architecture is already migration-ready

The decision to defer is low-risk because the architecture was built cleanly. The domain layer, state management, and services are already decoupled from browser-specific APIs. If conditions change, the Capacitor path from ADR-001 (a 2-file adaptation, 3–5 day effort) remains valid. The deferral does not create technical debt.

## Consequences

### Positive
- Zero additional infrastructure to maintain
- Single deployment pipeline (push to `main` → Vercel auto-deploy)
- Full development capacity remains focused on product features
- All 111 tests remain the authoritative quality gate with no native test surface to add
- Architecture flexibility preserved — Capacitor remains viable if needs change

### Negative
- iOS users on 16.4+ with home screen install do not receive push notifications (feature gap, not a bug)
- No App Store presence — discovery requires a direct URL
- No background refresh — content updates only when the app is open
- Home screen badge for unread count is not available

### Accepted trade-offs
These limitations are knowingly accepted as appropriate for the current stage:
- **Push notifications:** Not a core feature; users manually refresh. Acceptable for a daily-brief reading pattern.
- **App Store:** Not required; direct URL distribution is sufficient.
- **Background sync:** The app is designed to be opened intentionally, not to interrupt with background updates.

## Re-evaluation Criteria

This decision should be revisited when **any one** of the following conditions is met:

| Trigger | Threshold |
|---|---|
| Push notifications become a core feature request | Multiple users explicitly request background alerts as a blocking issue |
| App Store distribution is required | A partnership, enterprise use case, or growth strategy requires store presence |
| iOS PWA limitations cause real user friction | Measurable drop-off or complaints attributable to iOS-specific gaps |
| Background sync becomes essential | The reading pattern shifts to passive/alert-driven rather than intentional opening |
| Apple regresses PWA support | A Safari update meaningfully degrades the current PWA experience |
| Team scales beyond solo developer | More developers reduce the proportional cost of a second build pipeline |

## Documentation Policy

Per the mandate established with this ADR: **all future architectural and technical decisions must be documented as ADRs** stored under `/documents/analisis/`. Each ADR must follow this structure:

- Status (Proposed / Accepted / Deprecated / Superseded by ADR-N)
- Context
- Decision
- Options Considered (with pros/cons)
- Rationale
- Consequences
- References

ADR numbers are assigned sequentially. When a decision supersedes a prior one, the earlier ADR's Status field must be updated to `Superseded by ADR-N`.

## References

- [ADR-001: Mobile App Strategy — PWA vs Native](./ADR-001-mobile-app-strategy.md)
- [Vite PWA Plugin config — `vite.config.ts`](../../vite.config.ts)
- [Web Push API on iOS — WebKit Blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Workbox Service Worker strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
