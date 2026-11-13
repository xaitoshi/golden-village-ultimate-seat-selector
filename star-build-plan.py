#!/usr/bin/env python3
"""Build star-plan.json from extracted official plan seats."""
import json, os, math
from collections import defaultdict
import numpy as np
import cv2
from scipy.spatial import cKDTree

import star_group as sg
AZ = sg.AZ
ROOT = os.path.dirname(os.path.abspath(__file__))
LEVELS_IN = {
    'stalls': {'raw': '/tmp/star-stalls-v5.json', 'path': '/workspace/star-theatre-ref/maps/dpi300/plan-000.jpg',
               'name': 'Stalls', 'subtitle': '1,903 seats on levels 6 and 7', 'target': 1903,
               'canvas': (1600, 2260), 'start_letters': None},
    'circle1': {'raw': '/tmp/star-circle1-v5.json', 'path': '/workspace/star-theatre-ref/maps/dpi300/plan-001.jpg',
                'name': 'Circle 1', 'subtitle': '1,812 seats on levels 8 and 9', 'target': 1812,
                'canvas': (2000, 1410), 'start_letters': None},
    'circle2': {'raw': '/tmp/star-circle2-v5.json', 'path': '/workspace/star-theatre-ref/maps/dpi300/plan-002.jpg',
                'name': 'Circle 2', 'subtitle': '1,427 seats on levels 9 and 10', 'target': 1427,
                'canvas': (2000, 1410), 'start_letters': None},
}

DEFS = {
    'font': "Inter, Montserrat, 'Source Sans Pro', 'Liberation Sans', Arial, Helvetica, sans-serif",
    'bg': '#14110e', 'bg2': '#1c1712', 'panel': '#1a1510', 'panelEdge': '#8a6a40',
    'seat': '#c85c22', 'seatBack': '#8a3914', 'seatLit': '#e07030',
    'pitSeat': '#c85c22', 'pitBack': '#8a3914',
    'boxFill': '#b44e1c', 'boxBack': '#7a3010', 'boxStroke': '#e0b56a',
    'gold': '#c9a46c', 'goldDim': '#8a6a40', 'goldSoft': '#d4b88a',
    'ivory': '#f3e6d8', 'ivoryDim': '#c4b4a0', 'muted': '#9a8478',
    'wheelStroke': '#e0b56a',
    'hold': '#a88860', 'house': '#3a8aa8', 'emergency': '#2a3a6a', 'restricted': '#8a2818',
}

def walk_rows(seats, dmin=16, dmax=30):
    pts = np.array([[s['x'], s['y']] for s in seats])
    tree = cKDTree(pts)
    parent = list(range(len(seats)))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[rb] = ra
    for i, p in enumerate(pts):
        for j in tree.query_ball_point(p, dmax):
            if j <= i: continue
            d = float(np.hypot(*(pts[j] - p)))
            if dmin <= d <= dmax: union(i, j)
    groups = defaultdict(list)
    for i, s in enumerate(seats):
        groups[find(i)].append(s)
    return list(groups.values())

def psort(row):
    xs = np.array([s['x'] for s in row]); ys = np.array([s['y'] for s in row])
    if len(row) < 2:
        return sorted(row, key=lambda s: s['x'])
    X = np.column_stack([xs - xs.mean(), ys - ys.mean()])
    _, _, vt = np.linalg.svd(X, full_matrices=False)
    v = vt[0]
    # house left is smaller x (stage at top)
    if v[0] < 0: v = -v
    return sorted(row, key=lambda s: (s['x'] - xs.mean()) * v[0] + (s['y'] - ys.mean()) * v[1])

def row_names(prefix, start, n):
    i = AZ.index(start)
    names = []
    for k in range(n):
        if i + k >= len(AZ):
            names.append(prefix + AZ[-1] + AZ[(i + k) % len(AZ)])
        else:
            names.append(prefix + AZ[i + k])
    return names

def detect_wheels(seats, im):
    """Mark seats next to a wheelchair icon, or whose interior looks like a W."""
    H, W = im.shape[:2]
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    dark = (gray < 80).astype(np.uint8) * 255
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark, 8)
    icons = []
    for i in range(1, n):
        a = int(st[i, cv2.CC_STAT_AREA])
        ww, hh = int(st[i, cv2.CC_STAT_WIDTH]), int(st[i, cv2.CC_STAT_HEIGHT])
        if 40 <= a <= 280 and 8 <= ww <= 36 and 8 <= hh <= 36:
            cx = st[i, cv2.CC_STAT_LEFT] + ww / 2
            cy = st[i, cv2.CC_STAT_TOP] + hh / 2
            icons.append((cx, cy))
    if not icons:
        return
    tree = cKDTree(np.array([[s['x'], s['y']] for s in seats]))
    marked = set()
    for cx, cy in icons:
        # 1 or 2 nearest seats within 55 px
        d, idx = tree.query([cx, cy], k=min(3, len(seats)))
        if np.ndim(d) == 0:
            d, idx = [d], [idx]
        for di, j in zip(d, idx):
            if di < 55:
                marked.add(int(j))
    # also: seats whose center crop has a large W-like ink and no digit-like hole pattern
    for i, s in enumerate(seats):
        x, y = int(round(s['x'])), int(round(s['y']))
        crop = gray[max(0, y - 12):y + 13, max(0, x - 12):x + 13]
        if crop.size < 50: continue
        ink = (crop < 80).mean()
        if ink > 0.18 and i in marked or ink > 0.28:
            marked.add(i)
    for i in marked:
        if seats[i].get('kind') not in ('box',):
            seats[i]['kind'] = 'wheel'
    return len(marked)

def isolate_boxes(seats):
    """Stalls Box A (top left) and Box C (top right): compact 8-seat clusters."""
    # front-most, near the left and right walls
    ys = [s['y'] for s in seats]
    xs = [s['x'] for s in seats]
    y0 = np.percentile(ys, 5)
    left = [s for s in seats if s['y'] < y0 + 200 and s['x'] < np.percentile(xs, 25)]
    right = [s for s in seats if s['y'] < y0 + 200 and s['x'] > np.percentile(xs, 75)]
    def cluster8(cands, name):
        if len(cands) < 8: return []
        # take the 8 most isolated-from-the-bowl (smallest x for left, largest for right) that form a tight group
        cands = sorted(cands, key=lambda s: s['x'] if name == 'A' else -s['x'])
        # greedy: start from the extreme, collect 8 nearest to their centroid
        seed = cands[:12]
        # find a tight subset of 8
        pts = np.array([[s['x'], s['y']] for s in seed])
        # use the 8 with smallest bounding box among combinations is heavy; take 8 closest to the extreme
        extreme = seed[0]
        seed = sorted(seed, key=lambda s: (s['x'] - extreme['x']) ** 2 + (s['y'] - extreme['y']) ** 2)[:8]
        return seed
    a = cluster8(left, 'A')
    c = cluster8(right, 'C')
    box_ids = {id(s) for s in a + c}
    return a, c, box_ids

def section_stalls(rows, box_ids):
    """Split non-box rows into A,B,C (front) and D,E,F (rear)."""
    plain = []
    for row in rows:
        if any(id(s) in box_ids for s in row) and len(row) <= 10:
            continue
        plain.append(row)
    med_y = [np.median([s['y'] for s in r]) for r in plain]
    # spit front/rear at the largest y gap in the middle
    order = np.argsort(med_y)
    gaps = [(med_y[order[i + 1]] - med_y[order[i]], i) for i in range(len(order) - 1)]
    # prefer a gap around the middle third
    mid = [g for g in gaps if 0.25 * len(order) < g[1] < 0.75 * len(order)]
    split_i = max(mid or gaps, key=lambda t: t[0])[1]
    split_y = (med_y[order[split_i]] + med_y[order[split_i + 1]]) / 2
    xs = [np.median([s['x'] for s in r]) for r in plain]
    q1, q2 = np.percentile(xs, [33, 67])
    # tighter: use tertiles of front rows only
    front_xs = [np.median([s['x'] for s in r]) for r in plain if np.median([s['y'] for s in r]) < split_y]
    if front_xs:
        # three well-separated columns: look at x histogram gaps
        fx = np.sort(front_xs)
        fg = [(fx[i + 1] - fx[i], i) for i in range(len(fx) - 1)]
        fg.sort(reverse=True)
        cuts = sorted([fx[g[1]] + g[0] / 2 for g in fg[:2]])
        if len(cuts) == 2:
            q1, q2 = cuts
    buckets = {'A': [], 'B': [], 'C': [], 'D': [], 'E': [], 'F': []}
    for r in plain:
        my = np.median([s['y'] for s in r])
        mx = np.median([s['x'] for s in r])
        rear = my >= split_y
        if mx <= q1:
            buckets['D' if rear else 'A'].append(r)
        elif mx >= q2:
            buckets['F' if rear else 'C'].append(r)
        else:
            buckets['E' if rear else 'B'].append(r)
    starts = {'A': 'C', 'B': 'A', 'C': 'C', 'D': 'A', 'E': 'A', 'F': 'A'}
    out = []
    for pref, rows_ in buckets.items():
        rows_ = sorted(rows_, key=lambda r: np.median([s['y'] for s in r]))
        names = row_names(pref, starts[pref], len(rows_))
        for name, row in zip(names, rows_):
            out.append((name, psort(row)))
        print(f'  stalls {pref}: {len(rows_)} rows {names[0] if names else "-"}..{names[-1] if names else "-"} seats {sum(len(r) for r in rows_)}')
    return out

def section_circle(rows, level, prefixes):
    """Angular sectors around the horseshoe, front to back in each sector."""
    # focus near the stage / void
    alls = [s for r in rows for s in r]
    cx = np.median([s['x'] for s in alls])
    cy = np.percentile([s['y'] for s in alls], 8)  # near stage
    def ang(r):
        mx = np.median([s['x'] for s in r])
        my = np.median([s['y'] for s in r])
        return math.atan2(mx - cx, my - cy)  # 0 = down, +right
    angs = [ang(r) for r in rows]
    # n equal sectors? Use official 7 for circle1, guess for circle2
    nsec = len(prefixes)
    # split at largest angular gaps, expect nsec-1 big aisles plus maybe more
    order = np.argsort(angs)
    gaps = []
    for i in range(len(order) - 1):
        gaps.append((angs[order[i + 1]] - angs[order[i]], i))
    gaps.sort(reverse=True)
    cuts = sorted(angs[order[g[1]]] + g[0] / 2 for g in gaps[:nsec - 1])
    buckets = [[] for _ in range(nsec)]
    for r, a in zip(rows, angs):
        k = 0
        while k < len(cuts) and a > cuts[k]:
            k += 1
        buckets[k].append(r)
    # sectors go left (negative ang) to right; prefixes are listed left to right
    out = []
    for pref, bun in zip(prefixes, buckets):
        bun = sorted(bun, key=lambda r: np.median([s['y'] for s in r]) if pref in 'GHNMPQ' else np.median([s['y'] for s in r]))
        # front to back: smaller r from stage (smaller y at center, but arms have small y at the tips which are FRONT)
        # For arms (high |angle|), front is smaller y (closer to stage). For center, front is also smaller y.
        bun = sorted(bun, key=lambda r: np.median([s['y'] for s in r]))
        start = 'A'
        names = row_names(pref, start, len(bun))
        for name, row in zip(names, bun):
            out.append((name, psort(row)))
        print(f'  {level} {pref}: {len(bun)} rows {names[0] if names else "-"}..{names[-1] if names else "-"} seats {sum(len(r) for r in bun)}')
    return out

def number_row(name, row):
    out = []
    wspace = 0
    for i, s in enumerate(row):
        s = dict(s)
        s['row'] = name
        if s.get('kind') == 'wheel':
            wspace += 1
            s['space'] = wspace
            s['num'] = None
            s['id'] = f"{s['level']}.{name}.W{wspace}"
        else:
            # kind: keep hold/house/emergency/restricted as tags; viewer uses normal
            tag = s.get('kind', 'normal')
            if tag in ('hold', 'house', 'emergency', 'restricted'):
                s['tag'] = tag
                s['kind'] = 'normal'
            s['num'] = i + 1  # 1 from house left; W seats don't take a visible num but we still count position?
            # Official numbering skips W as if they occupy slots (BB: W W 3...). 
            # Use positional numbers for non-W only, starting at 1 from the left, incrementing for every seat including W so numbers match the printed ones.
            # Actually: count all positions, W get space not num, non-W get the position index (so 3 after two W).
            s['num'] = i + 1
            s['id'] = f"{s['level']}.{name}.{s['num']}"
        out.append(s)
    # fix: non-W nums should be the 1-based index in the row (including W positions) so BB is W,W,3,4,...
    for i, s in enumerate(out):
        if s['kind'] != 'wheel':
            s['num'] = i + 1
            s['id'] = f"{s['level']}.{name}.{s['num']}"
        else:
            s['id'] = f"{s['level']}.{name}.W{s['space']}"
    return out

def number_box(seats, box):
    # official: two columns, 1-5 (or 1-5 vertical) and 6-8. Sort by y then x? Plan shows 1 at bottom of the inner column, 5 at top, 6-8 the outer column.
    # Looking at Box A: left column 6,7,8 (bottom to top? 6 bottom, 8 top) and right column 1-5 (1 bottom, 5 top).
    # I'll sort into two x-groups, number the inner (toward the house) 1..n from the stage backward (smaller y first? 5 is toward stage which is smaller y, 1 is farther).
    # From the earlier left image: 1 is at the bottom (higher y, away from stage), 5 at the top (toward stage). 6 bottom, 8 top of the outer column.
    xs = [s['x'] for s in seats]
    mid = (min(xs) + max(xs)) / 2
    # Box A is on the left: inner is larger x (toward house). Box C on the right: inner is smaller x.
    if box == 'A':
        inner = [s for s in seats if s['x'] >= mid]
        outer = [s for s in seats if s['x'] < mid]
    else:
        inner = [s for s in seats if s['x'] <= mid]
        outer = [s for s in seats if s['x'] > mid]
    # number from back of house (larger y) to stage (smaller y): 1 is larger y
    inner = sorted(inner, key=lambda s: -s['y'])
    outer = sorted(outer, key=lambda s: -s['y'])
    out = []
    n = 1
    for s in inner + outer:
        s = dict(s)
        s['kind'] = 'box'
        s['box'] = box
        s['row'] = None
        s['num'] = n
        s['id'] = f"{s['level']}.Box{box}.{n}"
        n += 1
        out.append(s)
    return out

def scale_level(seats, canvas, margin=70):
    W, H = canvas
    xs = [s['x'] for s in seats]; ys = [s['y'] for s in seats]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    bw, bh = maxx - minx, maxy - miny
    sc = min((W - 2 * margin) / bw, (H - 2 * margin) / bh)
    # center
    ox = (W - sc * bw) / 2 - sc * minx
    oy = (H - sc * bh) / 2 - sc * miny
    # leave extra room at the top for the stage title
    oy += 20
    out = []
    for s in seats:
        t = dict(s)
        t['x'] = round(s['x'] * sc + ox, 2)
        t['y'] = round(s['y'] * sc + oy, 2)
        t['w'] = round(s.get('w', 25) * sc, 2)
        t['h'] = round(s.get('h', 23) * sc, 2)
        t['rot'] = round(float(s.get('rot', 0)), 2)
        out.append(t)
    return out, sc, ox, oy

def decorations(name, subtitle, W, H, seats):
    font = DEFS['font']
    # stage at the top centre
    cx = W / 2
    stage_y = max(36, min(s['y'] for s in seats) - 48)
    defs = f'''<defs>
<radialGradient id="vignette" cx="50%" cy="40%" r="75%">
<stop offset="0%" stop-color="{DEFS['bg2']}"/>
<stop offset="100%" stop-color="{DEFS['bg']}"/>
</radialGradient>
<linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#3a2a1c"/>
<stop offset="100%" stop-color="#1a120c"/>
</linearGradient>
<linearGradient id="goldMould" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#e8d09a"/>
<stop offset="45%" stop-color="#c9a46c"/>
<stop offset="100%" stop-color="#8a6a40"/>
</linearGradient>
</defs>'''
    background = f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>'
    sw = min(520, W * 0.36)
    deco = [
        f'<rect x="28" y="18" width="{W-56}" height="{H-36}" rx="18" ry="18" fill="{DEFS["panel"]}" stroke="{DEFS["panelEdge"]}" stroke-width="1.4"/>',
        f'<rect x="36" y="26" width="{W-72}" height="{H-52}" rx="12" ry="12" fill="none" stroke="{DEFS["gold"]}" stroke-width="0.6" opacity="0.35"/>',
        f'<text x="{cx:.1f}" y="52" fill="{DEFS["ivory"]}" font-family="{font}" font-size="20" font-weight="700" text-anchor="middle" letter-spacing="2">{name}</text>',
        f'<text x="{cx:.1f}" y="70" fill="{DEFS["goldSoft"]}" font-family="{font}" font-size="12" font-weight="500" text-anchor="middle">{subtitle}</text>',
        f'<rect x="{cx-sw/2:.1f}" y="{stage_y:.1f}" width="{sw:.1f}" height="32" fill="url(#stageGrad)"/>',
        f'<rect x="{cx-sw/2:.1f}" y="{stage_y+29:.1f}" width="{sw:.1f}" height="3" fill="{DEFS["gold"]}"/>',
        f'<text x="{cx:.1f}" y="{stage_y+21:.1f}" fill="{DEFS["gold"]}" font-family="{font}" font-size="13" font-weight="600" text-anchor="middle" letter-spacing="9">STAGE</text>',
    ]
    return defs, background, deco

def process(level, cfg):
    seats = json.load(open(cfg['raw']))
    # add a placeholder if circle1 is short — we'll try not to
    im = cv2.imread(cfg['path'])
    for s in seats:
        s['level'] = level
        if 'kind' not in s: s['kind'] = 'normal'
    nw = sg.detect_wheels(seats, im)
    print(f'{level}: {len(seats)} seats, marked wheels {nw}')
    labeled = []
    if level == 'stalls':
        a, c, named = sg.group_stalls(seats)
        print(f'  boxes A={len(a)} C={len(c)}')
        if len(a) == 8:
            labeled += number_box(a, 'A')
        if len(c) == 8:
            labeled += number_box(c, 'C')
        for name, row in named:
            labeled += number_row(name, row)
    elif level == 'circle1':
        named = sg.group_sectors(seats, list('GHJKLMN'), (228, 251, 269, 316, 269, 251, 228), 'circle1')
        for name, row in named:
            labeled += number_row(name, row)
    else:
        named = sg.group_sectors(seats, list('PQRSTUV'), (48, 357, 193, 231, 193, 357, 48), 'circle2')
        for name, row in named:
            labeled += number_row(name, row)

        # any leftover seats not in labeled?
    got = {id(s) for s in labeled}
    # labeled contains new dicts; match by coordinates
    have = {(round(s['x'], 1), round(s['y'], 1)) for s in labeled}
    missing = [s for s in seats if (round(s['x'], 1), round(s['y'], 1)) not in have]
    if missing:
        print(f'  leftover {len(missing)}, assigning to nearest row Z')
        for i, s in enumerate(sorted(missing, key=lambda t: (t['y'], t['x'])), 1):
            s = dict(s); s['row'] = 'Z'; s['num'] = i; s['id'] = f'{level}.Z.{i}'; s['kind'] = s.get('kind') or 'normal'
            if s['kind'] in ('hold', 'house', 'emergency', 'restricted'):
                s['tag'] = s['kind']; s['kind'] = 'normal'
            labeled.append(s)

    # unique ids
    ids = [s['id'] for s in labeled]
    if len(ids) != len(set(ids)):
        # suffix collisions
        seen = {}
        for s in labeled:
            if s['id'] in seen:
                k = 2
                base = s['id']
                while f'{base}v{k}' in seen:
                    k += 1
                # avoid dashes; use a letter suffix
                s['id'] = f'{base}b' if f'{base}b' not in seen else f'{base}c'
            seen[s['id']] = 1
        print('  fixed duplicate ids')

    scaled, sc, ox, oy = scale_level(labeled, cfg['canvas'])
    W, H = cfg['canvas']
    defs, bg, deco = decorations(cfg['name'], cfg['subtitle'], W, H, scaled)
    wheel = sum(1 for s in scaled if s['kind'] == 'wheel')
    boxn = sum(1 for s in scaled if s['kind'] == 'box')
    print(f'  labeled {len(scaled)} wheel {wheel} box {boxn} target {cfg["target"]}')
    return {
        'id': level,
        'name': cfg['name'],
        'subtitle': cfg['subtitle'],
        'width': W,
        'height': H,
        'defs': defs,
        'background': bg,
        'decorations': deco,
        'seats': [{k: s[k] for k in s if k in (
            'x', 'y', 'rot', 'w', 'h', 'kind', 'level', 'row', 'num', 'id', 'box', 'space', 'tag'
        )} for s in scaled],
        'sold': sum(1 for s in scaled if s['kind'] != 'wheel'),
        'wheelchair': wheel,
        'pit': 0,
        'box': boxn,
    }

def preview(plan, path):
    # simple raster of all three levels side by side is later; per-level preview
    pass

def main():
    levels = {}
    total = 0
    for lid, cfg in LEVELS_IN.items():
        levels[lid] = process(lid, cfg)
        total += len(levels[lid]['seats'])
    pub = 1903 + 1812 + 1427
    out = {
        'title': 'The Star Theatre, The Star Performing Arts Centre',
        'total': total,
        'published': pub,
        'defs': DEFS,
        'levels': levels,
    }
    dest = os.path.join(ROOT, 'star-plan.json')
    json.dump(out, open(dest, 'w'))
    print('WROTE', dest, 'total', total, 'published', pub)
    # uniqueness
    ids = [s['id'] for lv in levels.values() for s in lv['seats']]
    print('unique ids', len(set(ids)), 'of', len(ids))

if __name__ == '__main__':
    main()
