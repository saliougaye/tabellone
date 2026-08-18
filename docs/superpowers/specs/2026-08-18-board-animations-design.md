# Board animations — design

Date: 2026-08-18
Scope: `TODO.md` "add animations" (`apps/web`).

## Goal

`theme.css` already carries a fully worked-out motion system — six named
transitions, keyframes, durations, curves, and a `prefers-reduced-motion`
rewrite for every one of them — mapped to `animate-*` utilities in
`globals.css`. Most of it is unused. This pass wires up what's missing and
adds a small amount of new motion (button press feedback, a sliding
`ModeToggle` pill, a favourite-star pop, an initial-mount page fade) using the
same token conventions the rest of the file already follows.

Audited before designing anything (`rtk grep` across `apps/web/src` for every
`animate-*` class):

| Transition | Status |
|---|---|
| `animate-platform-confirm` | wired, works correctly |
| `animate-halo-pulse` | wired (`row.blinking`) |
| `animate-aging` | wired (stale board) |
| `animate-data-beat` | wired (loading dot) |
| `animate-skeleton` | wired (`SkeletonBlock`) |
| `animate-marquee` | wired (`MarqueeText`) |
| `animate-row-entry` | **defined, unused** |
| `animate-exit-departed` | **defined, unused** |
| `animate-exit-cancelled` | **defined, unused** |
| `animate-value-up` / `-down` | **defined, unused** |
| `animate-imminent-pulse` | defined, unused — but superseded by `halo-pulse` in the row v3 refactor per the token's own comment; not a gap, left alone |

`animate-platform-confirm` needed no investigation-turned-fix: `PlatformBox`
renders three mutually exclusive branches (absent / scheduled / confirmed).
When a row's platform flips to confirmed, React swaps to the confirmed
branch's `<span>`, which changes `animation-name` from `none` to
`tab-platform-confirm` on that DOM position — a CSS animation replays
whenever its computed `animation-name` changes, so this already fires
correctly on the poll where confirmation happens. No change needed here;
listed for completeness since it looked like a gap until traced.

## Components

### 1. Row entry

No new state. The row wrapper (`RichRow`, `LaterRow`, `HeroCard`,
`CompactRow`) gets a static `animate-row-entry` class plus
`animationDelay: calc(var(--stagger-delay) * ${index})` passed down from the
`.map()` call in `board-view.tsx`.

This works without any diffing because of how CSS animations interact with
React's reconciliation: a list item's `key` (`${trainNumber}-${scheduledTime}`)
is unchanged across polls for a surviving row, so React reuses the same DOM
node — a static class never re-triggers the keyframe on that node. A key that
wasn't in the previous render is a **new** DOM node, so the browser plays the
entry keyframe on first paint regardless of whether that happens on initial
page load (staggered cascade, matches `--stagger-delay`'s existence) or later
when a single new train appears mid-poll.

### 2. Row exit (departed / cancelled)

The one piece that needs real state. A row disappearing from `board.rows`
between polls would otherwise unmount instantly — no exit animation is
possible on a node that's already gone.

New hook, `apps/web/src/components/board/use-departing-rows.ts`:

```ts
function useDepartingRows<T>(
  rows: T[],
  keyFn: (row: T) => string,
): Array<{ key: string; row: T; phase: 'idle' | 'leaving' }>
```

- Keeps last-seen entries in state, keyed by `keyFn`.
- On each `rows` change: incoming rows become `phase: 'idle'` in their
  incoming order. Any previously-seen key missing from the incoming list is
  kept in its prior list position with `phase: 'leaving'` and its last known
  row snapshot (needed to read `status` for exit-variant selection after the
  row is otherwise gone from the data).
- A `leaving` entry is dropped from state after the exit duration. The
  duration is read once via
  `matchMedia('(prefers-reduced-motion: reduce)')` (same pattern
  `marquee-text.tsx` already uses) rather than trusting a JS constant matched
  to the CSS token by hand — 320ms normally, a short fixed fallback (~50ms,
  enough for React to commit the removal) under reduced motion.
- Exit variant: `row.status === 'CANCELLED'` → `animate-exit-cancelled`,
  everything else → `animate-exit-departed`.

No height-collapse animation on exit — `theme.css`'s exit keyframes only
animate opacity/transform/filter/scale, not height (unlike entry, which has
`--motion-row-entry` covering `height` explicitly). The row disappears
abruptly once the keyframe finishes and the node unmounts; that's the
existing design's own choice, not a gap this pass fills in.

Applied to `richRows`, `laterRows`, `restRows` in `board-view.tsx`. The hero
card is a single slot, not a list — a train leaving the hero position is
handled by component 3 below (key-swap crossfade on train identity), not by
this hook.

### 3. Value roll (delay/time digit)

New hook, `apps/web/src/lib/use-rolled-value.ts`:

```ts
function useRolledValue(delayMinutes: number | null): {
  key: number
  className: '' | 'animate-value-up' | 'animate-value-down'
}
```

Stores the previous `delayMinutes` via the "adjust state during render"
pattern (compare against a `useState`-held previous value; if different,
`setState` and derive direction in the same pass — the React-sanctioned way
to compute derived state from a prop change without an extra `useEffect`
render lag). Direction: increased delay → `up` (worsening), decreased →
`down` (improving), `null`↔`null` → no class.

Wired into the dominant time span in `RichRow`, `CompactRow`, and `HeroCard`
via the key-remount trick: `key={rolled.key}` on the span forces React to
mount a fresh node when the delay changes, which is what makes the
`animate-value-*` keyframe (opacity/transform "both") play at all — the same
mechanism component 1 relies on for row entry, applied here to a single
child instead of a list item.

`LaterRow` is skipped on purpose: it's already the least prominent row shape
(no operator mark emphasis, no route strip), and its schedule time is
secondary information — not worth the added complexity for a row users are
glancing past.

### 4. Platform confirm

No change — see the audit table above.

### 5. Button press feedback

`theme.css` already anticipates this: `--duration-instant` (120ms) is
documented as covering "screen change, data heartbeat, touch states," and
already collapses to `1ms` under `prefers-reduced-motion` in the existing
override block. No new tokens.

Add `active:scale-[0.97] transition-transform duration-(--duration-instant)
ease-(--ease-standard)` to: the favourite button, both `ModeToggle` segments,
the row-expand buttons (`RichRow`/`CompactRow`), and the station-name button
that opens the mobile sheet. Plain Tailwind `active:`, no JS — these are all
already `<button>` elements with an `onClick`, which is what makes `:active`
fire reliably on iOS Safari (it doesn't fire on tap without a click handler
present on the element).

### 6. ModeToggle sliding pill

Desktop and mobile segments aren't equal width (`flex-1` only below 600px;
auto/padding-driven width on desktop), so a `translateX(100%)`-based pill
can't work at both breakpoints. Instead: an absolutely-positioned pill
`<span>` inside the existing toggle container, with `left`/`width` synced to
the active button's `offsetLeft`/`offsetWidth` via a ref array + effect —
the same measure-and-sync shape `MarqueeText` already uses for overflow
detection, so it's a pattern already established in this codebase rather
than a new one.

Transition: `left`/`width` on `var(--duration-instant)` /
`var(--curve-standard)` — both existing tokens, no additions. The current
per-segment `bg-surface-inverse` swap on the active segment is replaced by
the pill (`bg-surface-inverse`) sitting behind the segment content; segment
text colour still swaps via the existing `transition-[color]`.

### 7. Favourite star pop

The one place this pass adds a genuinely new keyframe. `--duration-confirm`
(300ms) and `--curve-snap` (the single-overshoot curve, already reserved by
its own comment for platform confirmation — reusing it here for a second,
visually distinct "confirmation" event, a star turning on, is consistent
with what the curve is *for*, not a violation of "nothing else is entitled
to the snap": that line is about the row's platform box specifically).

```css
@keyframes tab-favourite-pop {
  0% { transform: scale(1); }
  55% { transform: scale(var(--confirm-scale)); }
  100% { transform: scale(1); }
}
```

New token: `--anim-favourite-pop: tab-favourite-pop var(--duration-confirm)
var(--curve-snap) both;`, mapped to `--animate-favourite-pop` in
`globals.css` alongside the other eleven. Reduced-motion override entry
added to the existing block, same shape as every other keyframe there
(collapses to no visible scale change).

Fires only on off→on: local `justFavourited` state set `true` in the
favourite button's click handler when the toggle result is `true`, class
applied conditionally, cleared via `onAnimationEnd`. Turning a favourite off
gets no pop — matches the asymmetric feel of most "mark as favourite" UI
(the interesting event is gaining one, not losing one).

### 8. Page transition — descoped to initial mount only

`--motion-screen` (`transform` on `--duration-screen`/`--curve-entry`,
`opacity` on `--duration-entry`/`--curve-linear`) is defined and unused.
Full route-transition — fading between the picker and a board, or between
`/partenze` and `/arrivi` — was considered and rejected for this pass: the
mode switch already has deliberately-tuned skeleton/placeholder logic from
the earlier "switch felt slow" fix (`board-screen.tsx`'s `pending` path,
`BoardSkeleton`), and a generic page-level fade stacked on top risks
reintroducing the jank that fix specifically eliminated. `router.replace`
navigations (mode switch, station switch) are explicitly excluded.

Scoped instead to `BoardScreen`'s outer `<main>`, once, on true initial
mount only (first paint of the whole app shell, not a client-side route
change): a `mounted` boolean starting `false`, flipped to `true` in a
`useEffect` on the empty dependency array, with `--motion-screen` as the
`transition` and the "entering" state being a few px of `translateY` +
`opacity: 0`. This is a mount-triggered CSS transition (start state →
`useEffect` flips to end state), not a `@keyframes` animation — matches how
`--motion-screen` is shaped (a `transition:` value list, not an `animate-*`
keyframe reference) and is exactly the mechanism the token's own name
implies.

## Reduced motion

Every new `@keyframes` addition (`tab-favourite-pop`) gets a matching entry
in the existing `@media (prefers-reduced-motion: reduce)` block in
`theme.css`, following the same "redefine the keyframe by name, don't touch
components" convention already in place for the other ten. Everything else
in this pass (press feedback, pill slide, page fade) rides on
`--duration-instant`/`--duration-entry`/`--duration-screen`, which already
collapse to `1ms` under that media query — no additional CSS needed for
those three.

## Testing

- `use-departing-rows.test.ts` (vitest, jsdom project): fake timers: a row
  present in one `rows` array and absent from the next is kept with
  `phase: 'leaving'` and the right exit variant, then dropped after the
  timeout; a row that reappears before its timeout fires is treated as
  still-idle (no duplicate/ghost entry).
- `use-rolled-value.test.ts`: direction is `up` for an increased delay,
  `down` for a decrease, empty for no change or `null`↔`null`; `key`
  changes exactly when `delayMinutes` does.
- No synthetic scenario gallery exists anymore to drive live entry/exit
  visually (`/dev/scenari` was removed in the post-backend cleanup) — visual
  confirmation of the row-level animations is manual, against the dev
  server with real board data, not something this pass can commit as a
  repeatable test. The hooks' logic is what's under test; the keyframes
  themselves are the same tokens already visually verified for
  platform-confirm/halo-pulse/aging in earlier work.
