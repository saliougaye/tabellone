# Brand logos — provenance and coverage

`brand-logos.tsx` fills the logo slot described in `theme.css` §7. This file records where
each asset came from and what is still missing, because the answer is not derivable from
the code.

## Where the assets do *not* come from

RFI's board is not a source. Every `<img class="logoCliente">` and `<img
class="logoCategoria">` in their HTML carries the same 34-byte 1×1 transparent GIF as its
`src` — the real mark is painted from a stylesheet sprite. That sprite is off-limits twice
over: propagating RFI's image payload is against the project's invariants, and the marks in
it are an old generation of the brands anyway.

So each asset is traced from a current reference and committed here as path data.

## Method

`scripts/trace-logo.py <logo.png> [epsilon]` turns a flat two-colour raster into an SVG
path and prints an IoU against the source mask. A Douglas–Peucker-simplified polygon is
enough for both kinds of mark here: the geometric ones (Frecce) it reproduces exactly, and
on organic ones (Italo's hare) a polygon fine enough to be indistinguishable at 22px is
still shorter than fitted beziers.

Two-tone marks are traced in one pass: ink pixels are clustered by hue and each cluster
becomes its own path, all sharing **one viewBox** taken from the combined bounding box —
normalising each shape to its own box would slide the pieces out of register. Gradients are
flattened to each cluster's mean colour; at 22px a gradient is invisible and could not ride
`currentColor` anyway. A source flattened onto opaque white has no alpha to key on, so the
ink mask comes from saturation instead — thresholding luminance there would eat the pale
end of a gradient.

IoU below ~0.99 means epsilon was too loose — but read it as a fidelity budget, not a
gate. On a geometric mark it costs nothing to satisfy (the Frecce monogram scores 0.9963
with 22 vertices). On an organic one it can cost a great deal: Italo's hare needs 560
vertices to clear 0.99 and only 42 to reach 0.9786. Since the slot renders at 22px, the
tie-breaker is mean alpha error *at that size*, where those two paths measure the same
~1.4% — so the short one wins. Spend vertices only where a viewport can see them.

## Coverage

| Service | Asset | Notes |
| --- | --- | --- |
| Frecciarossa | ✅ Frecce monogram | ε=6, 22 vertices, IoU 0.9963 |
| Frecciargento | ✅ Frecce monogram | same mark, `--brand-frecciargento` |
| Frecciabianca | ✅ Frecce monogram | same mark, `--brand-frecciabianca` |
| Italo | ✅ leaping hare | ε=2, 42 vertices, IoU 0.9786 — see the note on epsilon |
| Trenord | ✅ two-tone sail | ε=2, IoU 0.9919, 38 vertices; second fill via `--logo-ink-2` |
| Trenitalia | ✅ FS monogram | ε=1, IoU 0.9806, 87 vertices, two-tone |
| Intercity | ✅ wordmark | ε=1.5, IoU 0.9837, 226 vertices across 11 loops |
| Intercity Notte | ✅ (Intercity's) | placeholder until a Notte reference exists |
| Leonardo Express | ✅ wordmark + bar | ε=2, IoU 0.9973, 505 vertices; "express" is a knockout |
| Regionale · Regionale veloce | ✅ R + pin + swoosh | ε=1 at a 20° hue gap, IoU 0.9845, 250 vertices |
| Malpensa Express | ❌ | falls back to slot text |

Regionale is keyed on **category**, not brand — `serviceLogo` resolves it, and the reasoning
is in that function's comment.

## Wordmarks and the 22px ceiling

A wordmark has to survive the slot, and the slot is 22px tall (18px on mobile). Past roughly
**4.5:1** the width cap bites first and the mark scales *down* from 22px, so the letters lose
height fast:

| Aspect | Renders at | Verdict |
| --- | --- | --- |
| Leonardo Express 3.00:1 | 66×22 | reads |
| Intercity 4.61:1 | 88×19 | reads, only just |
| Frecciabianca 6.20:1 | 88×14 | mush |
| Frecciargento 6.32:1 | 88×14 | mush |
| Malpensa Express 6.85:1 | 88×13 | mush |

Frecciabianca and Frecciargento **have** wordmark references, and they are deliberately not
used: those two keep the Frecce monogram, which is legible at 22px where their wordmarks are
not. Malpensa Express has no monogram to fall back to, so it keeps the text fallback — real
14px text beats a 13px-tall traced wordmark. Test any new wordmark at 22px before shipping
it; the fallback is a designed state, not a broken one.

To add one: drop the path into `brandLogos`, add a `light-dark()` colour to
`brandLogoInk` and `theme.css` §BRAND LOGOS. `Brand` in `packages/core/src/types.ts` is a
union, so a brand the parser knows about is always visible here.

For a two-tone mark, give the second path `fill="var(--logo-ink-2, currentColor)"` and set
`secondary` on its `brandLogoInk` entry. The `currentColor` fallback is what makes the
cancelled row work: `ServiceMark` simply omits the property, and both halves mute together.

Check the knockout gap survives the slot. Trenord's narrowest is 9.7 viewBox units — 2.1px
at the desktop slot's 22px height — which holds; much tighter than that and the two colours
would bleed into one shape.
