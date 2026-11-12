#!/usr/bin/env python3
"""Sands Theatre top-down seat plan draft v1 for Seatwise approval. Draft images only."""

from __future__ import annotations

import math
import os
from xml.sax.saxutils import escape

OUT_DIR = "/workspace"
FONT = "Inter, Montserrat, 'Source Sans Pro', 'Liberation Sans', Arial, Helvetica, sans-serif"

# Palette
BG = "#12080a"
BG2 = "#1c0e12"
PANEL = "#180b0e"
PANEL_EDGE = "#7a5a28"
SEAT = "#8b1d2c"
SEAT_BACK = "#61141f"
SEAT_LIT = "#a32536"
PIT_SEAT = "#9c3340"
PIT_BACK = "#6e222c"
BOX_FILL = "#7a1520"
BOX_BACK = "#541018"
BOX_STROKE = "#d4af37"
GOLD = "#d4af37"
GOLD_DIM = "#8a6a2a"
GOLD_SOFT = "#c4a15a"
IVORY = "#f3e6d8"
IVORY_DIM = "#c4b4a0"
MUTED = "#9a8478"
VOID = "#100709"
STAGE_FLOOR = "#2a1810"
CURTAIN = "#4a1018"
WHEEL_STROKE = "#d4af37"
PIT_BAND = "#241014"

# ---------------------------------------------------------------------------
# Official plan row data (counts taken from Grand Theatre vector circles)
# ---------------------------------------------------------------------------

# Stalls, front to back. left, centre, right. special: pit, mix, inner (V), inset (OO)
STALLS = [
    # Orchestra pit lift (71)
    ("A", 3, 19, 3, "pit"),
    ("B", 4, 19, 4, "pit"),
    ("C", 0, 19, 0, "pit"),
    None,  # aisle after pit
    ("D", 7, 18, 7, ""),
    ("E", 8, 18, 8, ""),
    ("F", 8, 18, 8, ""),
    None,  # cross aisle: G and H have no side blocks
    ("G", 0, 17, 0, ""),
    ("H", 0, 17, 0, ""),
    ("J", 10, 17, 10, ""),
    ("K", 11, 17, 11, ""),
    ("L", 11, 17, 11, ""),
    ("M", 11, 16, 11, ""),
    ("N", 12, 16, 12, ""),
    ("O", 12, 16, 12, ""),
    ("P", 12, 16, 12, ""),
    ("Q", 12, 16, 12, ""),
    ("R", 13, 16, 13, ""),
    ("S", 13, 16, 13, ""),
    ("T", 13, 6, 13, "mix"),   # centre 3 + mix + 3
    ("U", 13, 6, 13, "mix"),
    ("V", 6, 6, 6, "mix,inner"),
    ("W", 0, 6, 0, "mix"),     # no side blocks
    None,  # aisle before AA; HH has no side blocks
    ("AA", 13, 16, 13, ""),
    ("BB", 14, 16, 14, ""),
    ("CC", 13, 16, 13, ""),
    ("DD", 13, 16, 13, ""),
    ("EE", 13, 16, 13, ""),
    ("FF", 13, 16, 13, ""),
    ("GG", 13, 17, 13, ""),
    ("HH", 0, 17, 0, ""),
    None,
    ("JJ", 12, 17, 12, ""),
    ("KK", 12, 17, 12, ""),
    ("LL", 11, 18, 11, ""),
    ("MM", 11, 18, 11, ""),
    ("NN", 10, 18, 10, ""),
    ("OO", 8, 18, 8, "inset"),
]

# Dress Circle A to D. D has wheelchair gaps.
# left/centre/right plus optional gap pattern for D
DRESS = [
    ("A", 13, 16, 13, ""),
    ("B", 13, 16, 13, ""),
    ("C", 13, 16, 13, ""),
    ("D", 8, 11, 8, "wheelchair"),
]

# Grand Circle A to F (lower), then G to S (upper, continuous)
GRAND_AF = [
    ("A", 14, 16, 14, ""),
    ("B", 14, 16, 14, ""),
    ("C", 14, 16, 14, ""),
    ("D", 14, 16, 14, ""),
    ("E", 13, 16, 13, ""),
    ("F", 0, 16, 0, ""),
]
# Continuous rows G to S (no I)
GRAND_GS = [
    ("G", 48),
    ("H", 47),
    ("J", 48),
    ("K", 47),
    ("L", 46),
    ("M", 45),
    ("N", 44),
    ("O", 43),
    ("P", 42),
    ("Q", 41),
    ("R", 34),
    ("S", 13),
]


def count_rows(rows):
    n = 0
    for r in rows:
        if not r:
            continue
        if len(r) == 2:
            n += r[1]
        else:
            n += r[1] + r[2] + r[3]
    return n


STALLS_N = count_rows(STALLS)  # 1238
DRESS_ROWS_N = count_rows(DRESS)  # 153
DRESS_BOX_N = 24
GRAND_AF_N = count_rows(GRAND_AF)  # 234
GRAND_GS_N = sum(r[1] for r in GRAND_GS)  # 498
GRAND_BOX_N = 8
DRESS_N = DRESS_ROWS_N + DRESS_BOX_N  # 177
GRAND_N = GRAND_AF_N + GRAND_GS_N + GRAND_BOX_N  # 740
TOTAL_DRAWN = STALLS_N + DRESS_N + GRAND_N  # 2155


class SVG:
    def __init__(self, w, h, bg=BG):
        self.w = w
        self.h = h
        self.parts = [
            f'<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
            f'<defs>',
            f'<radialGradient id="vignette" cx="50%" cy="40%" r="75%">',
            f'<stop offset="0%" stop-color="{BG2}"/>',
            f'<stop offset="100%" stop-color="{BG}"/>',
            f'</radialGradient>',
            f'<linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">',
            f'<stop offset="0%" stop-color="#3a2418"/>',
            f'<stop offset="100%" stop-color="#1a0e0a"/>',
            f'</linearGradient>',
            f'<linearGradient id="curtainL" x1="0" y1="0" x2="1" y2="0">',
            f'<stop offset="0%" stop-color="#3a0c14"/>',
            f'<stop offset="100%" stop-color="#5a1420"/>',
            f'</linearGradient>',
            f'<linearGradient id="curtainR" x1="1" y1="0" x2="0" y2="0">',
            f'<stop offset="0%" stop-color="#3a0c14"/>',
            f'<stop offset="100%" stop-color="#5a1420"/>',
            f'</linearGradient>',
            f'<linearGradient id="goldMould" x1="0" y1="0" x2="0" y2="1">',
            f'<stop offset="0%" stop-color="#f0d78a"/>',
            f'<stop offset="45%" stop-color="#d4af37"/>',
            f'<stop offset="100%" stop-color="#8a6a2a"/>',
            f'</linearGradient>',
            f'<filter id="soft" x="-20%" y="-20%" width="140%" height="140%">',
            f'<feGaussianBlur stdDeviation="1.2"/>',
            f'</filter>',
            f'</defs>',
            f'<rect width="{w}" height="{h}" fill="url(#vignette)"/>',
        ]

    def add(self, s):
        self.parts.append(s)

    def text(self, x, y, s, size=14, fill=IVORY, anchor="start", weight="normal",
             tracking=0, italic=False, opacity=1):
        ls = f' letter-spacing="{tracking}"' if tracking else ""
        fs = ' font-style="italic"' if italic else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        self.add(
            f'<text x="{x:.1f}" y="{y:.1f}" fill="{fill}" font-family="{FONT}" '
            f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}"{ls}{fs}{op}>'
            f"{escape(s)}</text>"
        )

    def close(self):
        self.parts.append("</svg>")
        return "\n".join(self.parts) + "\n"


def seat_rect(x, y, w, h, fill, back, stroke=None, sw=0.7, rx=2.4):
    # Back cushion sits at the bottom (away from the stage)
    bw = max(1.6, h * 0.28)
    stroke_attr = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    # slight rotation is applied by the caller via a group transform
    return (
        f'<g>'
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{rx}" ry="{rx}" '
        f'fill="{fill}"{stroke_attr}/>'
        f'<rect x="{x:.2f}" y="{y + h - bw:.2f}" width="{w:.2f}" height="{bw:.2f}" '
        f'rx="{rx * 0.7}" ry="{rx * 0.7}" fill="{back}"/>'
        f"</g>"
    )


def wheelchair_rect(x, y, w, h, rx=2.4):
    return (
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{rx}" ry="{rx}" '
        f'fill="#1a0c10" stroke="{WHEEL_STROKE}" stroke-width="1.1"/>'
    )


def emit_seat(x, y, rot, seat_w, seat_h, kind):
    if kind == "pit":
        fill, back, stroke, sw = PIT_SEAT, PIT_BACK, "#c45a64", 0.45
    elif kind == "box":
        fill, back, stroke, sw = BOX_FILL, BOX_BACK, BOX_STROKE, 1.0
    elif kind == "wheel":
        return (
            f'<g transform="translate({x:.2f},{y:.2f}) rotate({rot:.2f})">'
            + wheelchair_rect(-seat_w / 2, -seat_h / 2, seat_w, seat_h)
            + "</g>"
        ), x, y
    else:
        fill, back, stroke, sw = SEAT, SEAT_BACK, "#5a1018", 0.35
    el = (
        f'<g transform="translate({x:.2f},{y:.2f}) rotate({rot:.2f})">'
        + seat_rect(-seat_w / 2, -seat_h / 2, seat_w, seat_h, fill, back, stroke, sw)
        + "</g>"
    )
    return el, x, y


def bow_y(cx, y_base, k, x):
    return y_base + k * (x - cx) ** 2


def bow_rot(cx, k, x):
    # y = y_base + k (x-cx)^2, y increases downward. Right side tilts clockwise.
    return math.degrees(math.atan(2 * k * (x - cx)))


def block_xs(cx, left_n, cen_n, right_n, pitch, aisle, special):
    """Return (left_xs, cen_items, right_xs).
    cen_items is a list of (x, kind_extra) where kind_extra is '' or 'gap' for unused mix gap (not drawn)
    or 'wheel' for wheelchair.
    For mix, the centre bay is 16 wide and only 6 xs are returned as real seats.
    """
    mix = "mix" in special
    cen_bay = 16 if (mix or cen_n in (16, 17, 18, 19, 11)) else max(cen_n, 1)
    # Use the actual centre count as the bay when it's a normal full centre
    if not mix and "wheelchair" not in special:
        cen_bay = max(cen_n, 1) if cen_n else 16

    if cen_n or mix or "wheelchair" in special:
        bay = cen_bay if (mix or "wheelchair" in special) else cen_n
        if bay <= 0:
            cen_xs = []
        else:
            cen_xs = [cx + (i - (bay - 1) / 2.0) * pitch for i in range(bay)]
    else:
        cen_xs = []

    # Reference bay widths for sides so aisles stay aligned across rows
    # Use a stable inner edge based on a 16-seat (or actual) centre and a 13-seat side reference
    ref_cen = 16
    if not mix and "wheelchair" not in special and cen_n:
        ref_cen_width = (cen_n - 1) * pitch if cen_n > 1 else 0
        # but aisles should stay roughly consistent: use the actual centre edges
        cen_left_edge = cen_xs[0] if cen_xs else cx
        cen_right_edge = cen_xs[-1] if cen_xs else cx
    else:
        # mix / wheelchair: 16-bay
        if cen_xs:
            cen_left_edge, cen_right_edge = cen_xs[0], cen_xs[-1]
        else:
            cen_left_edge = cx - (ref_cen - 1) * pitch / 2
            cen_right_edge = cx + (ref_cen - 1) * pitch / 2

    left_inner = cen_left_edge - aisle  # x of aisle-most left seat (highest number)
    right_inner = cen_right_edge + aisle

    def side_xs(n, inner, toward_wall_sign, special, default_bay):
        # toward_wall_sign: -1 for left (wall is smaller x), +1 for right
        if n <= 0:
            return []
        if "inner" in special:
            # V: 6 seats closest to the aisle, of a 13-bay
            bay = 13
            wall_to_aisle = [inner + toward_wall_sign * - (bay - 1 - i) * pitch for i in range(bay)]
            # take the 6 closest to aisle: last 6 if wall-to-aisle
            return wall_to_aisle[-6:] if toward_wall_sign < 0 else wall_to_aisle[:6] if False else wall_to_aisle[-6:]
        if "inset" in special:
            # OO: 8 seats of a 12-bay, skip 2 at the wall and 2 at the aisle
            bay = 12
            xs = [inner + toward_wall_sign * - (bay - 1 - i) * pitch for i in range(bay)]
            return xs[2:10]
        # standard: n seats starting at the aisle going toward the wall
        # wall-to-aisle order (increasing x for left? left wall is smaller x)
        # aisle seat first in build, then reverse to wall-to-aisle
        xs = [inner + toward_wall_sign * - j * pitch for j in range(n)]
        xs.sort()
        return xs

    # Fix inner sides: build wall-to-aisle as increasing x for left? 
    # left: wall (small x) to aisle (larger x, = left_inner)
    # x[i] = left_inner - (bay-1-i)*pitch  for i=0..bay-1  => i=0 wall, i=bay-1 aisle=left_inner
    def left_bay_xs(n, special):
        if n <= 0:
            return []
        if "inner" in special:
            bay = 13
            xs = [left_inner - (bay - 1 - i) * pitch for i in range(bay)]
            return xs[-n:]  # inner n (closest to aisle)
        if "inset" in special:
            bay = 12
            xs = [left_inner - (bay - 1 - i) * pitch for i in range(bay)]
            return xs[2:2 + n]
        xs = [left_inner - (n - 1 - i) * pitch for i in range(n)]
        return xs

    def right_bay_xs(n, special):
        if n <= 0:
            return []
        if "inner" in special:
            bay = 13
            xs = [right_inner + i * pitch for i in range(bay)]  # i=0 aisle, i=12 wall
            return xs[:n]  # inner n
        if "inset" in special:
            bay = 12
            xs = [right_inner + i * pitch for i in range(bay)]
            return xs[2:2 + n] if False else xs[2:10]
        xs = [right_inner + i * pitch for i in range(n)]
        return xs

    left_xs = left_bay_xs(left_n, special)
    right_xs = right_bay_xs(right_n, special)

    # Centre items
    cen_items = []
    if "mix" in special and cen_n == 6:
        # 16-bay, seats at indices 0,1,2 and 13,14,15
        for i, x in enumerate(cen_xs):
            if i in (0, 1, 2, 13, 14, 15):
                cen_items.append((x, "seat"))
    elif "wheelchair" in special:
        # Dress D: left/centre/right handled via gap sets on FULL bays
        # This function is used with already-filtered n; wheelchair placement is done by caller
        for x in cen_xs:
            cen_items.append((x, "seat"))
    else:
        for x in cen_xs:
            cen_items.append((x, "seat"))

    return left_xs, cen_items, right_xs, cen_left_edge, cen_right_edge


def place_bow_seats(cx, y_base, k, xs, seat_w, seat_h, kind, flags=None):
    """xs: list of x or (x, flag) with flag 'seat' or 'wheel'."""
    elems = []
    coords = []
    for item in xs:
        if isinstance(item, tuple):
            x, flag = item
        else:
            x, flag = item, "seat"
        y = bow_y(cx, y_base, k, x)
        rot = bow_rot(cx, k, x)
        use = "wheel" if flag == "wheel" else kind
        el, x, y = emit_seat(x, y, rot, seat_w, seat_h, use)
        elems.append(el)
        coords.append((x, y))
    return elems, coords


def place_three_block(cx, y_base, k, left_n, cen_n, right_n, seat_w, seat_h,
                      pitch, aisle, special, kind="normal",
                      left_gaps=None, cen_gaps=None, right_gaps=None,
                      left_bay=None, cen_bay=None, right_bay=None):
    """Place a bowed three-block row. Optional wheelchair gaps use full bay sizes."""
    elems = []
    all_coords = []

    if "wheelchair" in special:
        lb, cb, rb = left_bay or 13, cen_bay or 16, right_bay or 13
        # Build full bay xs
        # centre
        cxs = [cx + (i - (cb - 1) / 2.0) * pitch for i in range(cb)]
        left_inner = cxs[0] - aisle
        right_inner = cxs[-1] + aisle
        lxs = [left_inner - (lb - 1 - i) * pitch for i in range(lb)]
        rxs = [right_inner + i * pitch for i in range(rb)]
        left_items = [(x, "wheel" if i in (left_gaps or set()) else "seat") for i, x in enumerate(lxs)]
        cen_items = [(x, "wheel" if i in (cen_gaps or set()) else "seat") for i, x in enumerate(cxs)]
        right_items = [(x, "wheel" if i in (right_gaps or set()) else "seat") for i, x in enumerate(rxs)]
        for group in (left_items, cen_items, right_items):
            es, cs = place_bow_seats(cx, y_base, k, group, seat_w, seat_h, kind)
            elems.extend(es)
            all_coords.extend(cs)
    else:
        left_xs, cen_items, right_xs, _, _ = block_xs(
            cx, left_n, cen_n, right_n, pitch, aisle, special
        )
        es, cs = place_bow_seats(cx, y_base, k, left_xs, seat_w, seat_h, kind)
        elems.extend(es)
        all_coords.extend(cs)
        seat_xs = [x for x, f in cen_items if f == "seat"]
        es, cs = place_bow_seats(cx, y_base, k, seat_xs, seat_w, seat_h, kind)
        elems.extend(es)
        all_coords.extend(cs)
        es, cs = place_bow_seats(cx, y_base, k, right_xs, seat_w, seat_h, kind)
        elems.extend(es)
        all_coords.extend(cs)

    # Label anchors: extreme left and right seats, offset outward
    if all_coords:
        left = min(all_coords, key=lambda p: p[0])
        right = max(all_coords, key=lambda p: p[0])
        lab_l = (left[0] - 14, left[1] + 3)
        lab_r = (right[0] + 14, right[1] + 3)
    else:
        lab_l = lab_r = (cx, y_base)
    return elems, all_coords, lab_l, lab_r


def place_continuous(cx, y_base, k, n, seat_w, seat_h, pitch, kind="normal"):
    if n <= 0:
        return [], [], (cx, y_base), (cx, y_base)
    xs = [cx + (i - (n - 1) / 2.0) * pitch for i in range(n)]
    es, cs = place_bow_seats(cx, y_base, k, xs, seat_w, seat_h, kind)
    left = min(cs, key=lambda p: p[0])
    right = max(cs, key=lambda p: p[0])
    return es, cs, (left[0] - 14, left[1] + 3), (right[0] + 14, right[1] + 3)


def draw_proscenium(svg: SVG, cx, top, width, with_pit=False, pit_depth=28):
    """Elegant gold proscenium, velvet curtains, stage bar. Returns y just below the pit/stage."""
    arch_h = 58
    stage_h = 38
    half = width / 2
    svg.add(
        f'<path d="M{cx-half-8:.1f},{top+10} C{cx-half+22:.1f},{top-8} {cx-half+52:.1f},{top+10} '
        f'{cx-half+74:.1f},{top+arch_h} L{cx-half-8:.1f},{top+arch_h+stage_h} Z" fill="url(#curtainL)" opacity="0.95"/>'
    )
    svg.add(
        f'<path d="M{cx+half+8:.1f},{top+10} C{cx+half-22:.1f},{top-8} {cx+half-52:.1f},{top+10} '
        f'{cx+half-74:.1f},{top+arch_h} L{cx+half+8:.1f},{top+arch_h+stage_h} Z" fill="url(#curtainR)" opacity="0.95"/>'
    )
    arch_y = top + 8
    svg.add(
        f'<path d="M{cx-half:.1f},{top+arch_h} '
        f'C{cx-half:.1f},{arch_y} {cx-half*0.55:.1f},{arch_y-4} {cx:.1f},{arch_y-6} '
        f'C{cx+half*0.55:.1f},{arch_y-4} {cx+half:.1f},{arch_y} {cx+half:.1f},{top+arch_h}" '
        f'fill="none" stroke="url(#goldMould)" stroke-width="5.5" stroke-linecap="round"/>'
    )
    svg.add(
        f'<path d="M{cx-half+8:.1f},{top+arch_h} '
        f'C{cx-half+8:.1f},{arch_y+8} {cx-half*0.55:.1f},{arch_y+6} {cx:.1f},{arch_y+5} '
        f'C{cx+half*0.55:.1f},{arch_y+6} {cx+half-8:.1f},{arch_y+8} {cx+half-8:.1f},{top+arch_h}" '
        f'fill="none" stroke="#f0d78a" stroke-width="1.15" opacity="0.75"/>'
    )
    for side in (-1, 1):
        x = cx + side * half
        svg.add(
            f'<rect x="{x-5.5:.1f}" y="{top+arch_h-2}" width="11" height="{stage_h+8}" '
            f'fill="url(#goldMould)" rx="1.5"/>'
        )
    svg.add(
        f'<rect x="{cx-half+6:.1f}" y="{top+arch_h}" width="{width-12:.1f}" height="{stage_h}" '
        f'fill="url(#stageGrad)"/>'
    )
    svg.add(
        f'<rect x="{cx-half+6:.1f}" y="{top+arch_h+stage_h-3.2}" width="{width-12:.1f}" height="3.2" fill="{GOLD}"/>'
    )
    svg.text(cx, top + arch_h + stage_h * 0.62, "STAGE", size=13, fill=GOLD,
             anchor="middle", weight="600", tracking=9)
    y = top + arch_h + stage_h
    if with_pit:
        pit_w = width * 0.74
        py = y + 6
        svg.add(
            f'<path d="M{cx-pit_w/2:.1f},{py} '
            f'Q{cx:.1f},{py+pit_depth+4} {cx+pit_w/2:.1f},{py} '
            f'L{cx+pit_w/2:.1f},{py+pit_depth} '
            f'Q{cx:.1f},{py+pit_depth+8} {cx-pit_w/2:.1f},{py+pit_depth} Z" '
            f'fill="{PIT_BAND}" stroke="{GOLD_DIM}" stroke-width="1.15"/>'
        )
        svg.text(cx, py + pit_depth * 0.68, "ORCHESTRA PIT", size=9, fill=GOLD_SOFT,
                 anchor="middle", weight="600", tracking=3.2)
        y = py + pit_depth + 8
    else:
        y += 12
    return y


def draw_panel_frame(svg, x, y, w, h, title, subtitle):
    svg.add(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" ry="18" '
        f'fill="{PANEL}" stroke="{PANEL_EDGE}" stroke-width="1.4"/>'
    )
    svg.add(
        f'<rect x="{x+8}" y="{y+8}" width="{w-16}" height="{h-16}" rx="12" ry="12" '
        f'fill="none" stroke="{GOLD}" stroke-width="0.6" opacity="0.35"/>'
    )
    svg.text(x + w / 2, y + 32, title, size=20, fill=IVORY, anchor="middle", weight="700", tracking=2)
    svg.text(x + w / 2, y + 50, subtitle, size=12, fill=GOLD_SOFT, anchor="middle", weight="500")
    return y + 62


def header(svg: SVG, w):
    svg.text(64, 48, "seat", size=22, fill=IVORY, weight="700", tracking=-0.5)
    svg.text(110, 48, "wise", size=22, fill=GOLD, weight="700", tracking=-0.5)
    svg.text(w / 2, 46, "Sands Theatre, Marina Bay Sands", size=32, fill=IVORY,
             anchor="middle", weight="700", tracking=0.8)
    svg.text(w / 2, 72, "Independent seat plan for approval", size=14, fill=GOLD_SOFT,
             anchor="middle", weight="500", tracking=1.5)
    svg.add(f'<line x1="80" y1="92" x2="{w-80}" y2="92" stroke="{GOLD}" stroke-width="1.2"/>')
    svg.add(f'<line x1="120" y1="96" x2="{w-120}" y2="96" stroke="{GOLD_DIM}" stroke-width="0.5"/>')
    svg.text(w - 64, 48, f"{TOTAL_DRAWN:,} seats drawn", size=16, fill=IVORY, anchor="end", weight="600")
    svg.text(w - 64, 68, "Published capacity 2,173", size=12, fill=MUTED, anchor="end")


def footer_legend(svg: SVG, x, y, w):
    svg.text(x, y, "LEGEND", size=11, fill=GOLD_SOFT, weight="700", tracking=3)
    items = [
        (SEAT, SEAT_BACK, None, "Seat"),
        (PIT_SEAT, PIT_BACK, "#c45a64", "Orchestra pit seat"),
        (BOX_FILL, BOX_BACK, BOX_STROKE, "VIP box seat"),
        (None, None, "wheel", "Wheelchair space"),
    ]
    ix = x
    iy = y + 16
    for fill, back, stroke, label in items:
        if stroke == "wheel":
            svg.add(wheelchair_rect(ix, iy, 16, 14))
        else:
            svg.add(seat_rect(ix, iy, 16, 14, fill, back, stroke, 0.8 if stroke else 0.4, rx=2.2))
        svg.text(ix + 22, iy + 12, label, size=13, fill=IVORY_DIM, weight="400")
        ix += 190
    svg.text(x + w, iy + 12, "Draft v1. Not an official Marina Bay Sands plan.",
             size=12, fill=MUTED, anchor="end")

    notes = [
        "Drawn from the official Grand Theatre seating plan. Row letters and counts follow the circles on that plan.",
        "Published capacity is 2,173, given as 1,260 stalls, 177 dress circle and 736 grand circle, with 32 VIP box seats already counted in those figures.",
        f"This drawing shows {TOTAL_DRAWN:,} seats marked on the plan: {STALLS_N:,} stalls (71 on the orchestra pit lift), {DRESS_N} dress circle (boxes 1 to 6), and {GRAND_N} grand circle (boxes 7 and 8).",
        "Stalls are 22 fewer than the published 1,260. Grand circle shows 740, which is 4 more than 736 if that figure already includes boxes 7 and 8. No seats were invented to close the gap.",
        "Rows I and II are not used. Dress circle row D gaps are shown as wheelchair spaces. The stalls mix position sits in the centre of rows T to W.",
        "Stalls rows G, H, W and HH, and grand circle row F, have no side blocks. Row S is a short rear row of 13. Some side rows are inset (V, OO). Curvature and aisle widths are approximate.",
    ]
    notes_y = iy + 36
    for i, line in enumerate(notes):
        svg.text(x, notes_y + i * 15.5, line, size=11, fill=MUTED, weight="400")


def stalls_k_for(name):
    """Front almost gentle, rear more bowed, matching the official horseshoe."""
    if name in list("ABCDEF"):
        return 0.00022
    if name in list("GHJKLMNOPQRSTUVW") or name in ("J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W"):
        return 0.00034
    if name in ("AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH"):
        return 0.00048
    return 0.00062  # JJ to OO


def draw_row_labels(svg, name, lab_l, lab_r, fill, size=7.5, min_y=None):
    lx, ly = lab_l
    rx, ry = lab_r
    if min_y is not None:
        ly = max(ly, min_y)
        ry = max(ry, min_y)
    svg.text(lx, ly, name, size=size, fill=fill, anchor="middle", weight="700")
    svg.text(rx, ry, name, size=size, fill=fill, anchor="middle", weight="700")


def draw_stalls_content(svg, ox, oy, pw, ph, seat_w=9.4, seat_h=8.6, compact=False):
    cx = ox + pw / 2
    stage_width = min(pw * 0.70, 520)
    y0 = draw_proscenium(svg, cx, oy, stage_width, with_pit=True, pit_depth=30)
    min_label_y = y0 + 4
    # Count row slots including aisle gaps to size row pitch so the last row sits near the bottom
    n_slots = 0
    for item in STALLS:
        n_slots += 1.25 if item is None else 1
    bottom = oy + ph - 18
    avail = bottom - (y0 + 10)
    row_pitch = avail / n_slots
    row_pitch = min(row_pitch, 28 if not compact else 17.5)
    row_pitch = max(row_pitch, 13.5 if compact else 16.5)
    pitch = 11.2 if compact else 12.4
    aisle = 24 if compact else 28
    y = y0 + 10
    all_elems = []
    labels = []
    mix_coords = []

    for item in STALLS:
        if item is None:
            y += row_pitch * 0.85
            continue
        name, L, C, R, special = item
        k = stalls_k_for(name)
        kind = "pit" if "pit" in special else "normal"
        elems, coords, lab_l, lab_r = place_three_block(
            cx, y, k, L, C, R, seat_w, seat_h, pitch, aisle, special, kind
        )
        all_elems.extend(elems)
        labels.append((name, lab_l, lab_r, kind == "pit"))
        if "mix" in special:
            mix_coords.extend(coords)
        y += row_pitch

    for el in all_elems:
        svg.add(el)

    # Mix position: in the centre gap of T-W (between the two centre groups)
    if mix_coords:
        # the gap is around cx, at the y of mid mix rows
        ys = [c[1] for c in mix_coords if abs(c[0] - cx) < 80]
        # better: use seats just left and right of centre
        lefts = [c for c in mix_coords if c[0] < cx]
        rights = [c for c in mix_coords if c[0] > cx]
        if lefts and rights:
            mid_y = (max(p[1] for p in lefts if p[0] == max(q[0] for q in lefts) or True) +
                     min(p[1] for p in rights)) / 2
            # simpler mid
            mid_y = (sorted(p[1] for p in mix_coords)[len(mix_coords)//2])
            svg.add(
                f'<rect x="{cx-40:.1f}" y="{mid_y-13:.1f}" width="80" height="26" rx="5" '
                f'fill="#16080a" stroke="{GOLD_DIM}" stroke-width="0.9"/>'
            )
            svg.text(cx, mid_y + 4, "Mix position", size=8, fill=GOLD_SOFT, anchor="middle", weight="600")

    for name, lab_l, lab_r, is_pit in labels:
        draw_row_labels(svg, name, lab_l, lab_r, GOLD if is_pit else IVORY_DIM,
                        size=7.5 if compact else 8.5, min_y=min_label_y)
    return STALLS_N


def draw_boxes_column(svg, names_and_sides, start_y, left_x, right_x, seat_w, seat_h, toward_end_y=None):
    """Draw groups of 4 box seats. names_and_sides: list of (name, 'L'|'R') front to back."""
    box_w, box_h = seat_w + 1.6, seat_h + 1.2
    box_pitch = max(15.5, seat_h + 6)
    group_gap = 22
    # Group by side in order
    for side in ("L", "R"):
        items = [(n, s) for n, s in names_and_sides if s == side]
        x = left_x if side == "L" else right_x
        gy = start_y
        for name, _ in items:
            svg.add(
                f'<rect x="{x-17:.1f}" y="{gy-11:.1f}" width="34" height="{4*box_pitch+8:.1f}" rx="5" '
                f'fill="#14080a" stroke="{GOLD}" stroke-width="1"/>'
            )
            lx = x + 26 if side == "L" else x - 26
            svg.text(lx, gy + 2 * box_pitch, f"Box {name}", size=9, fill=GOLD_SOFT,
                     anchor="start" if side == "L" else "end", weight="600")
            rot = -6 if side == "L" else 6
            for i in range(4):
                sy = gy + i * box_pitch
                el, _, _ = emit_seat(x, sy, rot, box_w, box_h, "box")
                svg.add(el)
            gy += 4 * box_pitch + group_gap


def draw_dress_content(svg, ox, oy, pw, ph, seat_w=12.4, seat_h=10.8):
    """A compact horseshoe: stage, a proportional well, boxes along the arms, rows at the back."""
    cx = ox + pw / 2
    stage_width = min(pw * 0.62, 520)
    y0 = draw_proscenium(svg, cx, oy, stage_width, with_pit=False)

    pitch = max(13.4, min(16.0, seat_w + 2.2))
    aisle = 32
    k = 0.00040
    row_pitch = max(22, seat_h + 14)
    n_rows = 4
    rows_h = row_pitch * n_rows + 8

    # Three boxes stacked with modest gaps, which sets the arm / well height
    box_w, box_h = seat_w + 1.6, seat_h + 1.1
    seat_pitch = max(14.5, seat_h + 5)
    box_frame_h = 4 * seat_pitch + 10
    box_gap = 14
    boxes_h = 3 * box_frame_h + 2 * box_gap
    well_pad_top = 18
    well_h = boxes_h + well_pad_top + 16

    # Scale the horseshoe up when the panel is tall, without overflowing its width
    unit_h = well_h + rows_h + 12
    avail = (oy + ph - 20) - (y0 + 8)
    scale = min(2.05, max(1.0, (avail * 0.80) / max(unit_h, 1)))
    def half_span(p, a):
        return ((13 - 1) * p) + a + ((16 - 1) * p) / 2 + 48
    max_half = pw / 2 - 44
    if half_span(pitch * scale, aisle * scale) > max_half:
        scale = min(scale, max_half / half_span(pitch, aisle))
    if scale > 1.02:
        seat_w *= scale
        seat_h *= scale
        pitch = max(pitch * scale, seat_w + 3.4)
        aisle *= scale
        row_pitch *= scale
        rows_h = row_pitch * n_rows + 8
        box_w, box_h = seat_w + 1.6, seat_h + 1.1
        seat_pitch = max(14.5, seat_h + 5)
        box_frame_h = 4 * seat_pitch + 10
        box_gap = 14 * min(scale, 1.3)
        boxes_h = 3 * box_frame_h + 2 * box_gap
        well_pad_top = 18 * min(scale, 1.3)
        well_h = boxes_h + well_pad_top + 16
        unit_h = well_h + rows_h + 12
    extra = max(0, avail - unit_h)
    y_well_top = y0 + 8 + extra * 0.35
    y_first = y_well_top + well_h

    # Well arc into the balcony
    svg.add(
        f'<path d="M{ox+70:.1f},{y_first-4} '
        f'Q{cx:.1f},{y_well_top-8} {ox+pw-70:.1f},{y_first-4}" '
        f'fill="none" stroke="{GOLD_DIM}" stroke-width="0.7" opacity="0.45"/>'
    )
    svg.text(cx, y_well_top + well_h * 0.42, "Looking toward the stalls", size=12, fill=MUTED,
             anchor="middle", weight="400", tracking=0.6)

    # Box x sits just outside the likely seat ends of a 13+16+13 row
    # 13*pitch + aisle + 16*pitch/2 roughly
    half_span = ((13 - 1) * pitch) + aisle + ((16 - 1) * pitch) / 2 + 36
    left_x = max(ox + 56, cx - half_span)
    right_x = min(ox + pw - 56, cx + half_span)

    names = {("L", 0): "6", ("L", 1): "5", ("L", 2): "4",
             ("R", 0): "1", ("R", 1): "2", ("R", 2): "3"}
    for side in ("L", "R"):
        x = left_x if side == "L" else right_x
        gy0 = y_well_top + well_pad_top
        for gi in range(3):
            gy = gy0 + gi * (box_frame_h + box_gap)
            name = names[(side, gi)]
            svg.add(
                f'<rect x="{x-18:.1f}" y="{gy-8:.1f}" width="36" height="{box_frame_h:.1f}" rx="5" '
                f'fill="#14080a" stroke="{GOLD}" stroke-width="1"/>'
            )
            lx = x + 28 if side == "L" else x - 28
            svg.text(lx, gy + 2 * seat_pitch, f"Box {name}", size=10, fill=GOLD_SOFT,
                     anchor="start" if side == "L" else "end", weight="600")
            rot = -6 if side == "L" else 6
            for i in range(4):
                el, _, _ = emit_seat(x, gy + 6 + i * seat_pitch, rot, box_w, box_h, "box")
                svg.add(el)

    left_gap = {1, 2, 6, 11, 12}
    cen_gap = {1, 5, 6, 10, 14}
    right_gap = {3, 4, 6, 10, 11}

    y = y_first
    for name, L, C, R, special in DRESS:
        if special == "wheelchair":
            elems, coords, lab_l, lab_r = place_three_block(
                cx, y, k, L, C, R, seat_w, seat_h, pitch, aisle, special, "normal",
                left_gaps=left_gap, cen_gaps=cen_gap, right_gaps=right_gap,
                left_bay=13, cen_bay=16, right_bay=13,
            )
        else:
            elems, coords, lab_l, lab_r = place_three_block(
                cx, y, k, L, C, R, seat_w, seat_h, pitch, aisle, special, "normal"
            )
        for el in elems:
            svg.add(el)
        draw_row_labels(svg, name, lab_l, lab_r, IVORY_DIM, size=10)
        y += row_pitch
    return DRESS_N



def draw_grand_content(svg, ox, oy, pw, ph, seat_w=10.2, seat_h=9.0):
    cx = ox + pw / 2
    stage_width = min(pw * 0.62, 520)
    y0 = draw_proscenium(svg, cx, oy, stage_width, with_pit=False)
    bottom = oy + ph - 28
    # 6 AF + gap + 12 GS = 19 slots
    n_slots = 6 + 0.9 + 12
    # Comfortable row spacing, then give leftover height to the well (the house below)
    max_pitch = 32
    min_well = 150
    room = bottom - (y0 + 12)
    # First pick a pitch that fits with at least min_well
    row_pitch = max(14.5, min(max_pitch, (room - min_well) / n_slots))
    seating_h = n_slots * row_pitch
    rest = room - seating_h
    well = max(min_well, rest * 0.78)
    y_first = y0 + well

    svg.add(
        f'<path d="M{ox+40:.1f},{y_first-6} '
        f'Q{cx:.1f},{y0+16} {ox+pw-40:.1f},{y_first-6}" '
        f'fill="none" stroke="{GOLD_DIM}" stroke-width="0.7" opacity="0.4"/>'
    )
    svg.text(cx, y0 + well * 0.42, "Looking toward the dress circle and stalls",
             size=12, fill=MUTED, anchor="middle", weight="400", tracking=0.4)

    # Boxes 8 (left) and 7 (right) just outside the A to E side blocks
    pitch = 12.6
    aisle = 30
    half = ((14 - 1) * pitch) + aisle + ((16 - 1) * pitch) / 2 + 42
    box_w, box_h = seat_w + 1.5, seat_h + 1.1
    box_y0 = y_first - 8
    left_x = max(ox + 50, cx - half)
    right_x = min(ox + pw - 50, cx + half)
    for name, x, rot in (("8", left_x, -6), ("7", right_x, 6)):
        svg.add(
            f'<rect x="{x-17:.1f}" y="{box_y0-10:.1f}" width="34" height="{4*15.5+8:.1f}" rx="5" '
            f'fill="#14080a" stroke="{GOLD}" stroke-width="1"/>'
        )
        lx = x + 26 if name == "8" else x - 26
        svg.text(lx, box_y0 + 28, f"Box {name}", size=10, fill=GOLD_SOFT,
                 anchor="start" if name == "8" else "end", weight="600")
        for i in range(4):
            el, _, _ = emit_seat(x, box_y0 + i * 15.5, rot, box_w, box_h, "box")
            svg.add(el)

    k_af = 0.00036
    y = y_first + 8
    for name, L, C, R, special in GRAND_AF:
        elems, coords, lab_l, lab_r = place_three_block(
            cx, y, k_af, L, C, R, seat_w, seat_h, pitch, aisle, special
        )
        for el in elems:
            svg.add(el)
        draw_row_labels(svg, name, lab_l, lab_r, IVORY_DIM, size=9)
        y += row_pitch

    y += row_pitch * 0.7  # aisle F to G
    k_gs = 0.00050
    for name, n in GRAND_GS:
        use_pitch = pitch * 0.98
        use_k = k_gs
        if name == "R":
            use_pitch = pitch * 1.10  # more openly spaced
        if name == "S":
            use_pitch = pitch * 1.05
            use_k = 0.00032  # short, gentler
        elems, coords, lab_l, lab_r = place_continuous(
            cx, y, use_k, n, seat_w, seat_h, use_pitch
        )
        for el in elems:
            svg.add(el)
        draw_row_labels(svg, name, lab_l, lab_r, IVORY_DIM, size=9)
        y += row_pitch
    return GRAND_N


def build_combined():
    W, H = 2720, 1760
    svg = SVG(W, H)
    header(svg, W)
    margin_x = 40
    gap = 28
    panel_w = (W - margin_x * 2 - gap * 2) / 3
    panel_y = 112
    panel_h = 1360
    footer_y = panel_y + panel_h + 24

    specs = [
        ("Stalls", f"{STALLS_N:,} seats, including 71 on the orchestra pit lift", "stalls"),
        ("Dress Circle", f"{DRESS_N} seats, including boxes 1 to 6", "dress"),
        ("Grand Circle", f"{GRAND_N} seats, including boxes 7 and 8", "grand"),
    ]
    for i, (title, sub, kind) in enumerate(specs):
        px = margin_x + i * (panel_w + gap)
        content_y = draw_panel_frame(svg, px, panel_y, panel_w, panel_h, title, sub)
        ox, oy = px + 10, content_y
        pw, ph = panel_w - 20, panel_h - (content_y - panel_y) - 16
        if kind == "stalls":
            draw_stalls_content(svg, ox, oy, pw, ph, compact=True)
        elif kind == "dress":
            draw_dress_content(svg, ox, oy, pw, ph, seat_w=10.8, seat_h=9.6)
        else:
            draw_grand_content(svg, ox, oy, pw, ph, seat_w=8.8, seat_h=7.8)

    footer_legend(svg, 56, footer_y, W - 112)
    return svg.close()


def build_level(kind):
    W, H = 1600, 2000
    svg = SVG(W, H)
    svg.text(56, 44, "seat", size=20, fill=IVORY, weight="700")
    svg.text(98, 44, "wise", size=20, fill=GOLD, weight="700")
    titles = {
        "stalls": ("Sands Theatre, Marina Bay Sands", "Stalls",
                   f"{STALLS_N:,} seats, including 71 on the orchestra pit lift"),
        "dress": ("Sands Theatre, Marina Bay Sands", "Dress Circle",
                  f"{DRESS_N} seats, including boxes 1 to 6"),
        "grand": ("Sands Theatre, Marina Bay Sands", "Grand Circle",
                  f"{GRAND_N} seats, including boxes 7 and 8"),
    }
    t, level, sub = titles[kind]
    svg.text(W / 2, 42, t, size=26, fill=IVORY, anchor="middle", weight="700")
    svg.text(W / 2, 68, f"{level}, {sub}", size=14, fill=GOLD_SOFT, anchor="middle", weight="500")
    svg.add(f'<line x1="80" y1="86" x2="{W-80}" y2="86" stroke="{GOLD}" stroke-width="1.2"/>')
    px, py, pw, ph = 40, 104, W - 80, 1740
    content_y = draw_panel_frame(svg, px, py, pw, ph, level, sub)
    ox, oy = px + 16, content_y
    cw, ch = pw - 32, ph - (content_y - py) - 20
    if kind == "stalls":
        draw_stalls_content(svg, ox, oy, cw, ch, seat_w=11.2, seat_h=9.8, compact=False)
    elif kind == "dress":
        draw_dress_content(svg, ox, oy, cw, ch, seat_w=14.2, seat_h=12.2)
    else:
        draw_grand_content(svg, ox, oy, cw, ch, seat_w=11.6, seat_h=10.0)
    svg.text(56, H - 28, "Independent layout for approval. Draft v1. Not an official Marina Bay Sands plan.",
             size=12, fill=MUTED)
    svg.text(W - 56, H - 28, f"{TOTAL_DRAWN:,} seats drawn from the official plan, of a published 2,173",
             size=12, fill=MUTED, anchor="end")
    return svg.close()


def write_and_render(svg_text, svg_path, png_path, scale=2.0):
    with open(svg_path, "w") as f:
        f.write(svg_text)
    import cairosvg
    cairosvg.svg2png(bytestring=svg_text.encode("utf-8"), write_to=png_path,
                     scale=scale, unsafe=True)
    print(f"wrote {svg_path} ({len(svg_text):,} chars)")
    print(f"wrote {png_path} ({os.path.getsize(png_path):,} bytes)")


def main():
    print(f"Counts: stalls={STALLS_N} dress={DRESS_N} grand={GRAND_N} total={TOTAL_DRAWN}")
    assert STALLS_N == 1238, STALLS_N
    assert DRESS_N == 177, DRESS_N
    assert GRAND_N == 740, GRAND_N
    assert TOTAL_DRAWN == 2155, TOTAL_DRAWN

    combined = build_combined()
    write_and_render(
        combined,
        os.path.join(OUT_DIR, "mbs-sands-theatre-layout-v1.svg"),
        os.path.join(OUT_DIR, "mbs-sands-theatre-layout-v1.png"),
        scale=2.0,
    )
    for kind in ("stalls", "dress", "grand"):
        page = build_level(kind)
        write_and_render(
            page,
            os.path.join(OUT_DIR, f"mbs-sands-theatre-layout-v1-{kind}.svg"),
            os.path.join(OUT_DIR, f"mbs-sands-theatre-layout-v1-{kind}.png"),
            scale=2.0,
        )


if __name__ == "__main__":
    main()
