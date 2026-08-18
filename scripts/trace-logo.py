#!/usr/bin/env python3
"""
Vectorise a flat brand logo into SVG path data, for `apps/web/src/components/board/
brand-logos.tsx`.

    python3 scripts/trace-logo.py <logo.png> [epsilon] [hue-gap-degrees]

Why this and not potrace: these marks are geometric or near-geometric — straight edges and
shallow arcs, no freehand curves — so a simplified polygon reproduces them exactly rather
than approximating them with beziers, and the result is a shorter path with no curve
artefacts at the 22px the board renders it at.

Method: build the ink mask, walk the crack boundary between ink and ground (each boundary
edge emitted clockwise so the interior stays on one side — exact, no marching-squares
saddle ambiguity), merge collinear runs, then Douglas–Peucker at `epsilon` source pixels.

Two-tone marks: ink pixels are clustered by hue, and each cluster is traced separately and
emitted as its own path. All paths share one viewBox, taken from the combined bounding box,
so the pieces stay in register — normalising each shape to its own box would slide them
apart. The printed colour per cluster is its mean; brand gradients are flattened, because
at 22px a gradient is invisible and `currentColor` cannot carry one anyway.

Prints an IoU against the source mask: anything below ~0.99 means epsilon is too loose.
Read that as a fidelity budget rather than a gate — on an organic outline, clearing 0.99
can cost an order of magnitude more vertices than the render size can resolve. See
`apps/web/src/components/board/README.md`.

Only PIL + numpy, so this runs without adding anything to the workspace.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

path = sys.argv[1]
EPS = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
# How far apart two hues must sit to count as separate inks. 40° suits a mark built from
# unrelated colours; a palette inside one family needs less (Regionale's two greens are 33°
# apart and merge into their mean at the default).
HUE_GAP = float(sys.argv[3]) if len(sys.argv) > 3 else 40.0

im = Image.open(path).convert('RGBA')
A = np.array(im.getchannel('A'))
RGB = np.array(im.convert('RGB')).astype(float) / 255

# The ink mask. A logo exported with transparency gives it to us directly; one exported
# flattened onto white does not, and thresholding luminance there would eat the pale parts
# of a gradient — so key on saturation instead, which white ground has none of.
if (A < 250).mean() > 0.01:
    INK = A > 128
    ground = 'alpha'
else:
    mx, mn = RGB.max(2), RGB.min(2)
    INK = (mx - mn) > 0.15
    ground = 'saturation (opaque source)'
    # An achromatic mark — greys, near-blacks — has no saturation to key on, and the
    # saturation mask silently returns almost nothing. Fall back to luminance against the
    # ground, taken from the median border pixel rather than assumed white.
    if INK.mean() < 0.005:
        border = np.concatenate([RGB[0], RGB[-1], RGB[:, 0], RGB[:, -1]])
        bg = np.median(border, axis=0)
        INK = np.abs(RGB - bg).max(2) > 0.15
        ground = 'luminance vs ground (achromatic, opaque source)'

# Near-white regions are knockouts, never ink. A mark drawn in flat ink has no second
# colour to paint them with, so the shape around them must carry them as holes — and an
# alpha-keyed source hands them over as opaque pixels that would otherwise be counted as
# ink and score the (correct) holes as an 8% tracing error.
_l = RGB.mean(2)
_sat = RGB.max(2) - RGB.min(2)
knockout = (_l > 0.85) & (_sat < 0.15)
if (INK & knockout).any():
    INK = INK & ~knockout
    ground += ', knockouts removed'

H, W = INK.shape

# Hue per pixel, for splitting a two-tone mark into one path per colour.
_mx, _mn = RGB.max(2), RGB.min(2)
_d = _mx - _mn + 1e-9
_r, _g, _b = RGB[..., 0], RGB[..., 1], RGB[..., 2]
HUE = np.where(_mx == _r, ((_g - _b) / _d) % 6,
               np.where(_mx == _g, (_b - _r) / _d + 2, (_r - _g) / _d + 4)) * 60


def hue_clusters(mask, gap=40.0):
    """Split the mask into one cluster per ink colour.

    Binned rather than compared value-to-value: the antialiased band between two inks lays
    down a thin trail of intermediate hues, and a handful of those pixels is enough to
    bridge two obviously separate modes if you only look for a gap between neighbouring
    sorted values. So bin the hues at 1°, treat any bin holding less than 0.2% of the peak
    as empty, and cut runs of empty bins wider than `gap`. Circular, so an ink straddling
    0° stays one cluster.
    """
    hues = HUE[mask]
    if len(hues) == 0:
        return [mask]
    counts = np.bincount(np.floor(hues).astype(int) % 360, minlength=360)
    occupied = counts > max(1.0, 0.002 * counts.max())
    if occupied.all() or not occupied.any():
        return [mask]

    # Rotate so index 0 starts an occupied run, then read the runs off in order.
    start = int(np.argmax(occupied & ~np.roll(occupied, 1)))
    rot = np.roll(occupied, -start)
    runs, i = [], 0
    while i < 360:
        if not rot[i]:
            i += 1
            continue
        j = i
        while j < 360 and rot[j]:
            j += 1
        # absorb a gap narrower than `gap` back into the run it interrupts
        k = j
        while k < 360 and not rot[k]:
            k += 1
        if k < 360 and (k - j) < gap:
            rot[j:k] = True
            continue
        runs.append((i, j))
        i = j
    if len(runs) < 2:
        return [mask]

    out = []
    shifted = (HUE - start) % 360
    for lo, hi in runs:
        out.append(mask & (shifted >= lo) & (shifted < hi))
    # Drop clusters whose mean is within noise of the ground: on a mark with a knockout or
    # a hairline, antialiasing forms a near-neutral band that hue-clusters as if it were a
    # colour of its own, and tracing it paints a ghost over the real shapes.
    keep = []
    for m in out:
        if m.sum() <= 0.005 * mask.sum():
            continue
        mean = RGB[m].mean(0)
        if (mean.max() - mean.min()) < 0.06 and mean.mean() > 0.85:
            continue
        keep.append(m)
    return keep or [mask]


def contours(mask):
    """Closed loops on the pixel lattice: outer contours clockwise, holes counter-
    clockwise, so SVG's default nonzero fill rule resolves them without fill-rule."""
    P = np.zeros((H + 2, W + 2), bool)
    P[1:-1, 1:-1] = mask
    core = P[1:-1, 1:-1]
    up = core & ~P[0:-2, 1:-1]
    down = core & ~P[2:, 1:-1]
    left = core & ~P[1:-1, 0:-2]
    right = core & ~P[1:-1, 2:]

    edges = {}

    def add(ys, xs, dt, dh):
        for y, x in zip(ys.tolist(), xs.tolist()):
            edges.setdefault((x + dt[0], y + dt[1]), []).append((x + dh[0], y + dh[1]))

    # clockwise in y-down: A(0,0) B(1,0) C(1,1) D(0,1)
    add(*np.nonzero(up), (0, 0), (1, 0))
    add(*np.nonzero(right), (1, 0), (1, 1))
    add(*np.nonzero(down), (1, 1), (0, 1))
    add(*np.nonzero(left), (0, 1), (0, 0))

    def turn_pick(prev_dir, tail, heads):
        # prefer straight, then right, then left, then back (keeps loops sane at pinches)
        def score(h):
            d = (h[0] - tail[0], h[1] - tail[1])
            if prev_dir is None:
                return 0
            cross = prev_dir[0] * d[1] - prev_dir[1] * d[0]
            dot = prev_dir[0] * d[0] + prev_dir[1] * d[1]
            if dot > 0:
                return 0
            return 1 if cross > 0 else 2 if cross < 0 else 3
        return min(heads, key=score)

    loops = []
    while edges:
        start = next(iter(edges))
        loop, tail, d = [start], start, None
        while True:
            heads = edges.get(tail)
            if not heads:
                break
            h = turn_pick(d, tail, heads)
            heads.remove(h)
            if not heads:
                del edges[tail]
            d = (h[0] - tail[0], h[1] - tail[1])
            tail = h
            if tail == start:
                break
            loop.append(tail)
        if len(loop) >= 4:
            loops.append(loop)
    return loops


def collapse(pts):
    """Merge collinear runs — the lattice walk emits one vertex per pixel step."""
    out = []
    n = len(pts)
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        if (b[0] - a[0]) * (c[1] - b[1]) != (b[1] - a[1]) * (c[0] - b[0]):
            out.append(b)
    return out or pts


def perp(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return ((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2) ** 0.5
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return ((p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2) ** 0.5


def dp(pts, eps):
    if len(pts) < 3:
        return pts
    stack, keep = [(0, len(pts) - 1)], {0, len(pts) - 1}
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        dm, km = 0, i
        for k in range(i + 1, j):
            v = perp(pts[k], pts[i], pts[j])
            if v > dm:
                dm, km = v, k
        if dm > eps:
            keep.add(km)
            stack.extend([(i, km), (km, j)])
    return [pts[i] for i in sorted(keep)]


def area(p):
    return sum(p[i][0] * p[i - 1][1] - p[i - 1][0] * p[i][1] for i in range(len(p))) / 2


def simplify(mask, eps):
    out = []
    for loop in sorted(contours(mask), key=lambda loop: -abs(area(loop))):
        c = collapse(loop)
        s = dp(c + [c[0]], eps)
        if s and s[0] == s[-1]:
            s = s[:-1]
        if len(s) >= 3 and abs(area(s)) > 200:
            out.append(s)
    return out


clusters = hue_clusters(INK, HUE_GAP)
traced = [(m, simplify(m, EPS)) for m in clusters]
traced = [(m, polys) for m, polys in traced if polys]
if not traced:
    sys.exit('no contour found')

print(f"{W}x{H}  ink from {ground}  clusters {len(traced)}")

# ── verify against the source mask ──────────────────────────────────────────────────────
# Rasterise the way the source was rasterised: supersample, then threshold at 50%. Filling
# at pixel centres instead would sit half a pixel off the ink boundary, and over a long
# perimeter that offset alone costs several percent of IoU — an artefact of the comparison,
# not of the trace.
# XOR each loop rather than filling them all: an outer contour and the hole inside it are
# separate loops, and filling both would paint the hole solid — which reads as a tracing
# error worth several percent on any mark with counters (letterforms, knockouts).
SS = 4
acc = np.zeros((H * SS, W * SS), bool)
for _, polys in traced:
    for poly in polys:
        one = Image.new('1', (W * SS, H * SS), 0)
        ImageDraw.Draw(one).polygon([(p[0] * SS, p[1] * SS) for p in poly], fill=1)
        acc ^= np.asarray(one, bool)
tr = np.asarray(Image.fromarray(acc).resize((W, H), Image.BOX).convert('L')) > 128
# Against the clusters we kept, not the whole ink mask: dropping a ghost cluster is a
# deliberate choice, and folding it in here would score that choice as a tracing error.
kept = np.zeros_like(INK)
for mask_, _ in traced:
    kept |= mask_
iou = (kept & tr).sum() / (kept | tr).sum()
print(f"IoU vs traced clusters: {iou:.5f}" + ("" if iou >= 0.99 else "   <-- too loose, lower epsilon"))
dropped = int(INK.sum() - kept.sum())
if dropped > 0.01 * INK.sum():
    print(f"  note: {dropped / INK.sum():.0%} of the ink mask was dropped as ghost or minor clusters")

# ── emit, with one viewBox shared by every path ─────────────────────────────────────────
allpts = [p for _, polys in traced for poly in polys for p in poly]
x0 = min(p[0] for p in allpts)
y0 = min(p[1] for p in allpts)
x1 = max(p[0] for p in allpts)
y1 = max(p[1] for p in allpts)
k = 100 / (y1 - y0)


def f(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


print(f'viewBox="0 0 {f((x1 - x0) * k)} 100"')
for mask, polys in traced:
    mean = (RGB[mask].mean(0) * 255).astype(int)
    verts = sum(len(p) for p in polys)
    d = ' '.join(
        'M' + ' L'.join(f'{f((x - x0) * k)} {f((y - y0) * k)}' for x, y in poly) + ' Z'
        for poly in polys
    )
    print(f'  /* #{"%02X%02X%02X" % tuple(mean)} · {len(polys)} loop(s), {verts} vertices */')
    print(f'  d="{d}"')
