#!/usr/bin/env python3
"""
Draws the ornament set in assets/svg/.

    python3 tools/make-ornaments.py

These are original drawings in the register of Kandyan decorative work —
the liyawel creeper, the punkalasa, the sesath fan, and a couple on the
poruwa. The motifs are traditional and centuries old; the paths here are
written from scratch by maths, not traced from anyone's artwork.

They are generated rather than hand-written because the shapes that carry
the style are the ones geometry is good at: spirals that keep their rate of
curl, scallops that stay even all the way round a rim, figures that are
exactly symmetric about their centre line.

Everything is drawn in currentColor, so a theme colours it by setting one
property. Paths that draw themselves on load carry pathLength="1", which
lets the stylesheet animate any of them with the same two declarations
however long the real path turns out to be.
"""
import math, os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "svg")
os.makedirs(OUT, exist_ok=True)

F = lambda n: f"{n:.2f}".rstrip("0").rstrip(".")      # tidy numbers in the file
P = lambda pts: " ".join(f"{F(x)},{F(y)}" for x, y in pts)


def poly(points, **attrs):
    """A path through sampled points — smooth enough at ornament scale."""
    d = "M" + " L".join(f"{F(x)} {F(y)}" for x, y in points)
    return path(d, **attrs)


def path(d, draw=None, fade=False, flame=False, turn=False, fill="none",
         width=1.6, cap="round", extra=""):
    bits = [f'd="{d}"', f'fill="{fill}"']
    if fill == "none":
        bits.append(f'stroke="currentColor" stroke-width="{F(width)}" '
                    f'stroke-linecap="{cap}" stroke-linejoin="round"')
    if draw:
        bits.append(f'pathLength="1" data-draw="{draw}"')
    if fade:
        bits.append('data-fade=""')
    if flame:
        bits.append('data-flame=""')
    if turn:
        bits.append('data-turn=""')
    if extra:
        bits.append(extra)
    return "  <path " + " ".join(bits) + "/>"


def spiral(cx, cy, turns=1.6, r0=1.0, r1=13.0, start=0.0, steps=60, flip=1):
    """An Archimedean curl — the tendril a creeper ends in."""
    pts = []
    total = turns * 2 * math.pi
    for i in range(steps + 1):
        t = total * i / steps
        r = r0 + (r1 - r0) * (1 - i / steps)
        a = start + t * flip
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def leaf(x, y, length=22, width=9, angle=0.0):
    """One betel-shaped leaf, tip outwards."""
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    def at(u, v):
        return (x + u * ca - v * sa, y + u * sa + v * ca)
    tip = at(length, 0)
    c1, c2 = at(length * 0.45, -width), at(length * 0.45, width)
    return (f"M{F(x)} {F(y)} Q{F(c1[0])} {F(c1[1])} {F(tip[0])} {F(tip[1])} "
            f"Q{F(c2[0])} {F(c2[1])} {F(x)} {F(y)} Z")


def petal(x, y, length=14, width=10, angle=0.0):
    """A broad, round-ended petal — a frangipani's, not a leaf's."""
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    def at(u, v):
        return (x + u * ca - v * sa, y + u * sa + v * ca)
    tip, base_l, base_r = at(length, 0), at(0, -width * 0.34), at(0, width * 0.34)
    # Control points held out wide and long, which rounds the far end
    c1, c2 = at(length * 0.35, -width), at(length * 1.05, -width * 0.62)
    c3, c4 = at(length * 1.05, width * 0.62), at(length * 0.35, width)
    return (f"M{F(base_l[0])} {F(base_l[1])} "
            f"C{F(c1[0])} {F(c1[1])} {F(c2[0])} {F(c2[1])} {F(tip[0])} {F(tip[1])} "
            f"C{F(c3[0])} {F(c3[1])} {F(c4[0])} {F(c4[1])} {F(base_r[0])} {F(base_r[1])} Z")


def svg(name, w, h, body, label):
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
           f'role="img" aria-label="{label}" focusable="false">\n'
           f'  <title>{label}</title>\n' + "\n".join(body) + "\n</svg>\n")
    with open(os.path.join(OUT, name), "w") as f:
        f.write(doc)
    print(f"  {name:22s} {w}x{h}  {len(doc)/1024:.1f} kB")


# --- Liyawel: the creeper, as a rule between sections -----------------

def liyawel():
    w, h, mid = 480, 64, 32.0
    body = []

    # One stem, waving, drawn from the middle outwards in both directions
    for side in (1, -1):
        pts = []
        for i in range(61):
            t = i / 60
            x = 240 + side * t * 210
            y = mid + 11 * math.sin(t * math.pi * 2.1) * (1 - t * 0.25)
            pts.append((x, y))
        body.append(poly(pts, draw="1", width=1.7))

        # Leaves off the crests, alternating above and below the stem
        for k, t in enumerate((0.22, 0.46, 0.70)):
            x = 240 + side * t * 210
            y = mid + 11 * math.sin(t * math.pi * 2.1) * (1 - t * 0.25)
            up = -1 if k % 2 == 0 else 1
            body.append(path(leaf(x, y, 20, 8, 90 * up + side * 22),
                             fill="currentColor", fade=True))

        # and a curl at the far end, the way a creeper actually stops
        body.append(poly(spiral(240 + side * 212, mid + 6, turns=1.5,
                                r1=11, flip=side), draw="2", width=1.5))

    # A bud at the centre, where the two halves meet
    body.append(path(
        f"M240 {F(mid - 13)} C247 {F(mid - 6)} 247 {F(mid + 3)} 240 {F(mid + 9)} "
        f"C233 {F(mid + 3)} 233 {F(mid - 6)} 240 {F(mid - 13)} Z",
        fill="currentColor", fade=True))
    body.append(path(f"M240 {F(mid + 9)} L240 {F(mid + 15)}", draw="2", width=1.4))

    svg("liyawel.svg", w, h, body, "A creeper motif")


# --- Araliya: temple flowers on a stem, the lighter rule --------------

def araliya():
    w, h, mid = 480, 64, 32.0
    body = [poly([(30 + i * 4.2, mid + 7 * math.sin(i / 100 * math.pi * 2))
                  for i in range(101)], draw="1", width=1.5)]

    for x in (150, 240, 330):
        scale = 1.5 if x == 240 else 1.15
        y = mid + 7 * math.sin((x - 30) / 420 * math.pi * 2)
        # Five broad petals, each set out from the centre so they overlap
        # the way a frangipani's do rather than meeting at a point.
        for k in range(5):
            a = math.radians(k * 72 + (18 if x == 240 else 0))
            px, py = x + 3.5 * scale * math.cos(a), y + 3.5 * scale * math.sin(a)
            body.append(path(
                petal(px, py, 13 * scale, 9.5 * scale, math.degrees(a)),
                fill="currentColor", fade=True))
        body.append(f'  <circle cx="{F(x)}" cy="{F(y)}" r="{F(2.4 * scale)}" '
                    f'fill="currentColor" opacity="0.55" data-fade=""/>')

    svg("araliya.svg", w, h, body, "Temple flowers on a stem")


# --- Punkalasa: the pot of plenty -------------------------------------

def punkalasa():
    w, h = 200, 250
    cx = 100.0
    body = []

    rim = 88.0        # where the mouth of the pot is
    # Coconut flower rising out of the mouth, one frond at a time
    for i, (angle, length) in enumerate(
            ((-90, 70), (-62, 62), (-118, 62), (-38, 50), (-142, 50))):
        a = math.radians(angle)
        tip = (cx + length * math.cos(a), rim + length * math.sin(a))
        bend = (cx + length * 0.45 * math.cos(a) - 16 * math.sin(a),
                rim + length * 0.45 * math.sin(a) + 16 * math.cos(a))
        body.append(path(f"M{F(cx)} {F(rim)} Q{F(bend[0])} {F(bend[1])} "
                         f"{F(tip[0])} {F(tip[1])}",
                         draw="1" if i < 2 else "2", width=1.6))
        body.append(path(leaf(tip[0], tip[1], 13, 5.5, angle + 180),
                         fill="currentColor", fade=True))

    # The mouth: a flared rim over a short neck, which is what makes it a
    # pot rather than a bulb with leaves in it
    body.append(path(f"M62 {F(rim)} L138 {F(rim)}", draw="1", width=2.0))
    body.append(path(f"M62 {F(rim)} L70 {F(rim + 10)} L130 {F(rim + 10)} "
                     f"L138 {F(rim)}", draw="1", width=1.7))
    body.append(path(f"M70 {F(rim + 10)} L74 {F(rim + 20)} M130 {F(rim + 10)} "
                     f"L126 {F(rim + 20)}", draw="2", width=1.5))

    # The belly: wider than it is tall, shouldered high
    body.append(path(
        "M74 108 C50 118 44 142 52 162 C60 182 78 192 100 192 "
        "C122 192 140 182 148 162 C156 142 150 118 126 108",
        draw="2", width=1.9))
    # The foot
    body.append(path("M76 192 L124 192 L132 204 L68 204 Z", draw="3", width=1.7))
    body.append(path("M68 204 L132 204 L140 216 L60 216 Z", draw="3", width=1.7))

    # A band of beads round the belly, the way a brass pot is chased
    for k in range(11):
        t = k / 10
        a = math.pi * (0.12 + 0.76 * t)
        x, y = cx - 50 * math.cos(a), 150 + 14 * math.sin(a)
        body.append(path(f"M{F(x)} {F(y)} m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0",
                         fill="currentColor", fade=True))

    svg("punkalasa.svg", w, h, body, "A pot of plenty")


# --- Sesath: the ceremonial fan ---------------------------------------

def sesath():
    w = h = 200
    cx = cy = 100.0
    body = []
    r = 70.0

    # Scalloped rim: an even ring of arcs, which is the whole look of it
    n = 18
    step = 2 * math.pi / n
    pts = []
    for k in range(n + 1):
        a = -math.pi / 2 + k * step
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d = f"M{F(pts[0][0])} {F(pts[0][1])}"
    for k in range(n):
        x, y = pts[k + 1]
        d += f" A6 6 0 0 1 {F(x)} {F(y)}"
    body.append(path(d + " Z", draw="1", width=1.8))

    # Ribs and inner rings, turning slowly as one piece
    inner = ['<g data-turn="" style="transform-origin:100px 100px">']
    for k in range(n):
        a = -math.pi / 2 + k * step + step / 2
        inner.append(path(f"M{F(cx + 22 * math.cos(a))} {F(cy + 22 * math.sin(a))} "
                          f"L{F(cx + 62 * math.cos(a))} {F(cy + 62 * math.sin(a))}",
                          fade=True, width=1.2))
    inner.append(f'  <circle cx="{F(cx)}" cy="{F(cy)}" r="22" fill="none" '
                 f'stroke="currentColor" stroke-width="1.6" pathLength="1" data-draw="2"/>')
    inner.append(f'  <circle cx="{F(cx)}" cy="{F(cy)}" r="9" fill="currentColor" data-fade=""/>')
    inner.append("</g>")
    body.extend(inner)

    svg("sesath.svg", w, h, body, "A ceremonial fan")


# --- The couple on the poruwa -----------------------------------------

def couple():
    w, h = 320, 260
    body = []

    # A thorana arch over the whole scene
    body.append(path("M24 214 L24 120 C24 52 92 22 160 22 C228 22 296 52 296 120 L296 214",
                     draw="1", width=2.0))
    body.append(path("M40 214 L40 122 C40 64 98 38 160 38 C222 38 280 64 280 122 L280 214",
                     draw="2", width=1.2))
    # Curls where the arch springs, the makara's tail end of the motif
    body.append(poly(spiral(40, 120, turns=1.4, r1=13, flip=-1), draw="3", width=1.4))
    body.append(poly(spiral(280, 120, turns=1.4, r1=13, flip=1), draw="3", width=1.4))

    def figure(cx, bride):
        """One stylised figure: head, shoulders, torso, and what they wear."""
        g = []
        top = 96.0
        # Head
        g.append(f'  <circle cx="{F(cx)}" cy="{F(top)}" r="11" fill="none" '
                 f'stroke="currentColor" stroke-width="1.7" pathLength="1" data-draw="2"/>')
        if bride:
            # Nalalpata: the headpiece worn across the brow, filled rather
            # than outlined so it reads as worked gold at this size, with
            # the hair gathered behind
            g.append(path(f"M{F(cx - 14)} {F(top - 4)} Q{F(cx)} {F(top - 20)} "
                          f"{F(cx + 14)} {F(top - 4)} Q{F(cx)} {F(top - 11)} "
                          f"{F(cx - 14)} {F(top - 4)} Z",
                          fill="currentColor", fade=True))
            for k in (-1, 0, 1):                       # the points of the crown
                g.append(path(f"M{F(cx + k * 7)} {F(top - 11 - abs(k) * 1.5)} "
                              f"L{F(cx + k * 8.5)} {F(top - 20 + abs(k) * 3)}",
                              draw="3", width=1.3))
            g.append(path(f"M{F(cx + 9)} {F(top + 6)} q9 6 4 16", draw="3", width=1.5))
        else:
            # The four-cornered hat of a Nilame
            g.append(path(f"M{F(cx - 15)} {F(top - 8)} L{F(cx - 11)} {F(top - 22)} "
                          f"L{F(cx)} {F(top - 27)} L{F(cx + 11)} {F(top - 22)} "
                          f"L{F(cx + 15)} {F(top - 8)} Z", draw="2", width=1.7))
            g.append(path(f"M{F(cx - 15)} {F(top - 8)} L{F(cx + 15)} {F(top - 8)}",
                          draw="3", width=1.4))

        # Shoulders and torso
        shoulder = top + 15
        half = 20.0 if not bride else 15.0
        g.append(path(f"M{F(cx - half)} {F(shoulder + 5)} Q{F(cx)} {F(shoulder - 4)} "
                      f"{F(cx + half)} {F(shoulder + 5)}", draw="2", width=1.8))
        waist = shoulder + 32
        g.append(path(f"M{F(cx - half)} {F(shoulder + 5)} L{F(cx - half * 0.62)} {F(waist)}",
                      draw="3", width=1.6))
        g.append(path(f"M{F(cx + half)} {F(shoulder + 5)} L{F(cx + half * 0.62)} {F(waist)}",
                      draw="3", width=1.6))

        # What falls below the waist: an osariya's fan, or a Nilame's skirt
        hem = 196.0
        if bride:
            g.append(path(f"M{F(cx - 9)} {F(waist)} C{F(cx - 30)} {F(waist + 34)} "
                          f"{F(cx - 34)} {F(hem - 12)} {F(cx - 30)} {F(hem)} "
                          f"L{F(cx + 30)} {F(hem)} C{F(cx + 34)} {F(hem - 12)} "
                          f"{F(cx + 30)} {F(waist + 34)} {F(cx + 9)} {F(waist)} Z",
                          draw="3", width=1.8))
            for k in range(-2, 3):                       # the pleats of the fall
                g.append(path(f"M{F(cx + k * 7)} {F(waist + 16)} "
                              f"L{F(cx + k * 10)} {F(hem - 4)}", fade=True, width=1.0))
        else:
            g.append(path(f"M{F(cx - 13)} {F(waist)} L{F(cx - 26)} {F(hem)} "
                          f"L{F(cx + 26)} {F(hem)} L{F(cx + 13)} {F(waist)} Z",
                          draw="3", width=1.8))
            g.append(path(f"M{F(cx - 20)} {F(waist + 20)} L{F(cx + 20)} {F(waist + 20)}",
                          fade=True, width=1.2))

        # A necklace, because both wear one, and it is what catches the light
        g.append(path(f"M{F(cx - 7)} {F(shoulder + 8)} Q{F(cx)} {F(shoulder + 17)} "
                      f"{F(cx + 7)} {F(shoulder + 8)}", fade=True, width=1.3))
        return g

    body.extend(figure(128, bride=False))
    body.extend(figure(192, bride=True))

    # The poruwa they stand on: platform, rail, and the four posts
    body.append(path("M74 196 L246 196 L246 208 L74 208 Z", draw="3", width=1.9))
    body.append(path("M84 208 L84 222 M236 208 L236 222", draw="3", width=1.7))
    body.append(path("M68 222 L252 222", draw="3", width=2.0))
    for k in range(7):                                   # turned balusters
        x = 92 + k * 22.7
        body.append(path(f"M{F(x)} 208 L{F(x)} 222", fade=True, width=1.0))

    # A lamp either side, lit
    for x in (56, 264):
        body.append(path(f"M{F(x - 11)} 214 L{F(x + 11)} 214 L{F(x + 7)} 206 "
                         f"L{F(x - 7)} 206 Z", draw="3", width=1.5))
        body.append(path(f"M{F(x)} 206 L{F(x)} 196", draw="3", width=1.4))
        body.append(path(f"M{F(x - 8)} 196 Q{F(x)} 188 {F(x + 8)} 196 Z",
                         draw="3", width=1.5))
        body.append(
            f'  <g data-flame="" style="transform-origin:{F(x)}px 192px">' +
            path(f"M{F(x)} 192 C{F(x - 5)} 184 {F(x - 2)} 178 {F(x)} 172 "
                 f"C{F(x + 2)} 178 {F(x + 5)} 184 {F(x)} 192 Z",
                 fill="currentColor").strip() + "</g>")

    svg("kandyan-couple.svg", w, h, body, "A couple on the poruwa, between two lamps")


for make in (liyawel, araliya, punkalasa, sesath, couple):
    make()
print("\nwrote", os.path.relpath(OUT))
