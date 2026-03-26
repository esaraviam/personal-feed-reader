# ADR-003: PWA Native-Quality Enhancement Strategy

## Status
Accepted

## Context

Following [ADR-002](./ADR-002-stay-with-pwa.md), the decision was made to remain with the PWA architecture. The next logical question is: how do we maximize the perceived native quality of the app within PWA constraints?

A systematic audit of the current codebase (`index.html`, `vite.config.ts`, `App.tsx`, `TabBar.tsx`, `ArticleCard.tsx`, `index.css`) revealed concrete gaps between the current implementation and a native-grade mobile experience. These gaps were categorized by impact and implementation complexity.

**Current implementation strengths (baseline):**

| Feature | Status |
|---|---|
| `display: standalone` in manifest | ✅ |
| Workbox offline caching (app shell + RSS proxy) | ✅ |
| Dark mode across all components | ✅ |
| Input font-size 16px (prevents iOS zoom) | ✅ |
| Skeleton loading states | ✅ |
| `backdrop-blur-sm` on TabBar | ✅ |
| Touch press states (`active:bg-*`) | ✅ |
| Offline banner | ✅ |

**Critical gaps found:**

1. `index.html` missing all iOS-specific meta tags (apple-mobile-web-app-capable, status-bar-style, apple-touch-icon, theme-color, title)
2. No safe area inset handling — TabBar overlaps iPhone home indicator
3. Icons are SVG-only — iOS requires PNG for home screen icons
4. Tab switching has zero transition — instant cuts feel browser-like
5. No install prompt or guidance for Add to Home Screen
6. No pull-to-refresh gesture
7. Touch feedback is color-only, no scale/depress transform
8. No Apple splash screen — iOS shows a white flash on launch
9. `recommended-feeds.json` not cached by Workbox (`.json` excluded from glob)
10. All four tab views loaded eagerly regardless of active tab

## Decision

Implement a phased set of PWA enhancements grouped by priority:

- **Priority 1 (Critical):** Fix `index.html` meta tags, safe area insets, PNG icons, tab transitions
- **Priority 2 (High impact):** Custom install prompt, pull-to-refresh, touch scale feedback, splash screens
- **Priority 3 (Polish):** Haptic feedback, dark mode flash fix, Workbox JSON caching, lazy-loaded views, SW update notification
- **Priority 4 (Micro-polish):** `overscroll-behavior`, `touch-action`, `user-select`, touch target sizes

## Options Considered

### Option A: Address only critical gaps (Priority 1 only)

- **Pros:** Minimal effort (~1 day), eliminates the most jarring gaps
- **Cons:** Misses high-value gestures (pull-to-refresh) and touch feedback that define native feel

### Option B: Full enhancement across all priorities ✅ *Selected*

- **Pros:** Comprehensive native quality, each priority builds on the last, all changes are additive and reversible
- **Cons:** 5–7 days total effort spread across priorities

### Option C: Accept current state and focus on features

- **Pros:** Zero dev time on UX infrastructure
- **Cons:** The existing gaps (especially safe area and missing meta tags) are correctness issues, not nice-to-haves

## Rationale

Priority 1 items are correctness bugs, not enhancements. The TabBar overlapping the home indicator and the app launching with a white flash are broken behaviors on every modern iPhone. These must be fixed regardless of other prioritization decisions.

Priority 2 items (pull-to-refresh, install prompt, touch feedback) directly affect the most frequent daily interaction: opening the app, pulling to refresh, and tapping articles. These are the actions that define whether the app "feels native."

Priority 3 and 4 items are incremental polish with low individual effort but meaningful cumulative effect.

The approach is intentionally additive — no existing functionality changes, no dependencies added (haptics use `navigator.vibrate()`, transitions use CSS, pull-to-refresh uses touch events).

## Consequences

### Positive
- Eliminates the most visible browser-ness signals (white flash, TabBar overlap, no transitions)
- Pull-to-refresh aligns with every user's muscle memory from native news apps
- Haptic feedback on Android adds tactile confirmation at zero cost
- Lazy-loaded views reduce initial parse time and improve startup on lower-end devices
- Workbox JSON caching makes Discover fully functional offline

### Negative
- Tab transitions require keeping all views mounted simultaneously (slightly higher memory usage)
- Pull-to-refresh must be carefully implemented to not conflict with Android Chrome's native pull-to-refresh behavior (`overscroll-behavior: contain` required)
- Apple splash screens require generating and maintaining multiple resolution PNG files

### Accepted limitations (cannot be bridged in PWA)

These gaps are acknowledged and accepted per ADR-002:

| Gap | Reason |
|---|---|
| Home screen badge (unread count) | iOS Badging API not exposed from PWA |
| Background refresh | iOS does not allow arbitrary SW background fetch scheduling |
| Push notifications on iOS < 16.4 | WebKit platform limitation |
| Haptic patterns on iOS | `navigator.vibrate()` silently no-ops on iOS |
| True lock-screen push delivery | Not guaranteed from iOS PWA |

## Implementation Reference

### Priority 1 — `index.html` corrections

```html
<title>Daily Brief</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
<meta name="color-scheme" content="light dark" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Daily Brief" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
```

Note: `viewport-fit=cover` is required for `env(safe-area-inset-*)` to have any effect.

### Priority 1 — Safe area insets

```css
/* TabBar must pad for home indicator */
padding-bottom: env(safe-area-inset-bottom);

/* Header must pad for Dynamic Island / notch */
padding-top: env(safe-area-inset-top);

/* Main content accounts for both */
padding-bottom: calc(env(safe-area-inset-bottom) + 4rem);
```

### Priority 1 — Tab transitions

Render all four tab views simultaneously, use CSS `opacity` + `pointer-events` to show/hide. Keeps scroll position between tab switches (native behavior). Use 200ms opacity fade.

### Priority 2 — Touch scale feedback

```tsx
// Press: instant depress (75ms) then spring back
className="active:scale-[0.98] transition-transform duration-75"
```

### Priority 2 — Pull-to-refresh

Implement via `touchstart`/`touchend` listeners on the scroll container. Threshold: 64px drag. Show a spinner indicator while pulling. Guard with `overscroll-behavior: contain` to prevent conflict with Chrome's native PTR.

### Priority 3 — Haptic feedback

```ts
// Android only — iOS silently ignores navigator.vibrate()
export const tapHaptic    = () => navigator.vibrate?.(10);
export const successHaptic = () => navigator.vibrate?.([10, 50, 10]);
```

Apply `tapHaptic()` on tab switches. Apply `successHaptic()` on feed add, import success.

### Priority 3 — Workbox JSON caching

```ts
// vite.config.ts
globPatterns: ['**/*.{js,css,html,svg,woff2,json}']
```

### Priority 3 — Lazy load tab views

```tsx
const HomeView     = lazy(() => import('./views/HomeView'));
const FeedsView    = lazy(() => import('./views/FeedsView'));
const DiscoverView = lazy(() => import('./views/DiscoverView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
```

## References

- [ADR-001: Mobile App Strategy](./ADR-001-mobile-app-strategy.md)
- [ADR-002: Retain PWA Architecture](./ADR-002-stay-with-pwa.md)
- [Apple PWA meta tags reference — WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [CSS env() safe area insets — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [Web App Manifest — MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox — vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Navigator.vibrate() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)
- [Current PWA config — `vite.config.ts`](../../vite.config.ts)
- [Current HTML shell — `index.html`](../../index.html)
- [CSS baseline — `src/index.css`](../../src/index.css)
