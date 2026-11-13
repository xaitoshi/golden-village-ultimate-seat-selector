"""Row grouping and W-seat detection for The Star Theatre plan."""
import math
import cv2
import numpy as np
from collections import defaultdict
from scipy.spatial import cKDTree

AZ = [c for c in 'ABCDEFGHJKLMNPQRSTUVWXYZ']

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
    if v[0] < 0: v = -v
    return sorted(row, key=lambda s: (s['x'] - xs.mean()) * v[0] + (s['y'] - ys.mean()) * v[1])

def row_names(prefix, start, n):
    i = AZ.index(start)
    names = []
    for k in range(n):
        idx = i + k
        if idx < len(AZ):
            names.append(prefix + AZ[idx])
        else:
            names.append(prefix + 'Z' + str(idx - len(AZ) + 1))
    return names

_W_TMPL = None
def _w_template():
    global _W_TMPL
    if _W_TMPL is None:
        g = cv2.cvtColor(cv2.imread('/workspace/star-theatre-ref/maps/dpi300/plan-000.jpg'), cv2.COLOR_BGR2GRAY)
        _W_TMPL = g[429 - 9:429 + 10, 953 - 9:953 + 10].copy()
    return _W_TMPL

def detect_wheels(seats, im, w_center=(953, 429)):
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    tmpl = _w_template()
    def rot(img, ang):
        h, w = img.shape
        M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1)
        return cv2.warpAffine(img, M, (w, h), borderValue=255)
    tmpls = [rot(tmpl, ang) for ang in range(-90, 91, 10)]
    n = 0
    for s in seats:
        x, y = int(round(s['x'])), int(round(s['y']))
        crop = gray[max(0, y - 12):y + 13, max(0, x - 12):x + 13]
        if crop.shape[0] < 19 or crop.shape[1] < 19:
            continue
        best = -1.0
        for t in tmpls:
            if crop.shape[0] < t.shape[0] or crop.shape[1] < t.shape[1]:
                continue
            res = cv2.matchTemplate(crop, t, cv2.TM_CCOEFF_NORMED)
            best = max(best, float(res.max()))
        if best >= 0.62:
            s['kind'] = 'wheel'
            n += 1
    return n

def _med(row, key):
    return float(np.median([s[key] for s in row]))

def merge_frags(frags, y_tol=14):
    """Merge aisle-split fragments of the same official row (similar median y)."""
    if not frags:
        return []
    frags = sorted(frags, key=lambda r: (_med(r, 'y'), _med(r, 'x')))
    out = [list(frags[0])]
    for r in frags[1:]:
        if abs(_med(r, 'y') - _med(out[-1], 'y')) <= y_tol:
            out[-1] = out[-1] + list(r)
        else:
            out.append(list(r))
    return out

def cut_by_key(rows, key, targets, reverse=False):
    """Greedily assign sorted rows to sections to hit target seat counts."""
    rows = sorted(rows, key=lambda r: _med(r, key), reverse=reverse)
    buckets = [[] for _ in targets]
    counts = [0] * len(targets)
    i = 0
    for r in rows:
        # if adding to current would overshoot more than moving to next, and next exists
        if i < len(targets) - 1:
            over = counts[i] + len(r) - targets[i]
            under = targets[i] - counts[i]
            if over > 0 and over >= under and counts[i] > 0:
                i += 1
        buckets[i].append(r)
        counts[i] += len(r)
    return buckets, counts

def group_stalls(seats):
    # boxes first
    ys = [s['y'] for s in seats]; xs = [s['x'] for s in seats]
    y0 = np.percentile(ys, 5)
    def cluster8(cands, side):
        if len(cands) < 8: return []
        cands = sorted(cands, key=lambda s: s['x'] if side == 'A' else -s['x'])
        extreme = cands[0]
        return sorted(cands, key=lambda s: (s['x'] - extreme['x']) ** 2 + (s['y'] - extreme['y']) ** 2)[:8]
    box_a = cluster8([s for s in seats if s['y'] < y0 + 200 and s['x'] < np.percentile(xs, 25)], 'A')
    box_c = cluster8([s for s in seats if s['y'] < y0 + 200 and s['x'] > np.percentile(xs, 75)], 'C')
    box_ids = {id(s) for s in box_a + box_c}
    rest = [s for s in seats if id(s) not in box_ids]
    frags = walk_rows(rest)
    # 3 columns: A+D=574, B+E=739, C+F=574
    cols, cc = cut_by_key(frags, 'x', [574, 739, 574])
    print('  stall columns', cc)
    starts = {'A': 'C', 'B': 'A', 'C': 'C', 'D': 'A', 'E': 'A', 'F': 'A'}
    targets_fr = {'left': ([279, 295], 'AD'), 'mid': ([342, 397], 'BE'), 'right': ([279, 295], 'CF')}
    named = []
    for col, (t, letters), coln in zip(cols, [targets_fr['left'], targets_fr['mid'], targets_fr['right']], cc):
        halves, hc = cut_by_key(col, 'y', t)
        print(f'    {letters} split', hc, 'targets', t)
        for pref, bun in zip(letters, halves):
            bun = merge_frags(bun, 14)
            bun = sorted(bun, key=lambda r: _med(r, 'y'))
            names = row_names(pref, starts[pref], len(bun))
            for name, row in zip(names, bun):
                named.append((name, psort(row)))
            print(f'      {pref}: {len(bun)} rows {names[0] if names else "-"}..{names[-1] if names else "-"} seats {sum(len(r) for r in bun)}')
    return box_a, box_c, named

def group_sectors(seats, prefixes, targets, label):
    frags = walk_rows(seats)
    # angle from a focus near the stage
    cx = float(np.median([s['x'] for s in seats]))
    cy = float(np.percentile([s['y'] for s in seats], 6))
    def ang(r):
        mx, my = _med(r, 'x'), _med(r, 'y')
        return math.atan2(mx - cx, my - cy)
    # sort fragments left (neg ang) to right
    frags = sorted(frags, key=ang)
    buckets, counts = cut_by_key(
        # cut_by_key sorts by key; we want sort by angle. Use a fake 'x' of angle
        [(__import__('copy').deepcopy(r)) or r for r in frags],
        'x', targets  # WRONG - will sort by x not angle
    )
    # do it manually
    buckets = [[] for _ in targets]
    counts = [0] * len(targets)
    i = 0
    for r in frags:
        if i < len(targets) - 1:
            over = counts[i] + len(r) - targets[i]
            under = targets[i] - counts[i]
            if over > 0 and over >= under and counts[i] > 0:
                i += 1
        buckets[i].append(r)
        counts[i] += len(r)
    # Move a boundary fragment if it improves the match to official counts
    for i in range(len(targets) - 1):
        if not buckets[i + 1]:
            continue
        first = buckets[i + 1][0]
        err0 = abs(counts[i] - targets[i]) + abs(counts[i + 1] - targets[i + 1])
        err1 = abs(counts[i] + len(first) - targets[i]) + abs(counts[i + 1] - len(first) - targets[i + 1])
        if err1 < err0:
            buckets[i].append(buckets[i + 1].pop(0))
            counts[i] += len(first)
            counts[i + 1] -= len(first)
    print(f'  {label} sector counts {counts} targets {list(targets)}')
    named = []
    for pref, bun, t in zip(prefixes, buckets, targets):
        bun = merge_frags(bun, 16)
        bun = sorted(bun, key=lambda r: _med(r, 'y'))
        names = row_names(pref, 'A', len(bun))
        for name, row in zip(names, bun):
            named.append((name, psort(row)))
        last = names[-1] if names else '-'
        flag = ' OK' if sum(len(r) for r in bun) == t else ' **'
        print(f'    {pref}: {len(bun)} rows {names[0] if names else "-"}..{last} seats {sum(len(r) for r in bun)} target {t}{flag}')
    return named
