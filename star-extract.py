#!/usr/bin/env python3
"""Extract official Star Theatre seats from 300 dpi plan JPEGs."""
import json, os, sys
import cv2
import numpy as np

PLANS = {
    'stalls': {
        'path': '/workspace/star-theatre-ref/maps/dpi300/plan-000.jpg',
        'target': 1903,
        'legend_y': 2580,
    },
    'circle1': {
        'path': '/workspace/star-theatre-ref/maps/dpi300/plan-001.jpg',
        'target': 1812,
        'legend_y': 1980,
    },
    'circle2': {
        'path': '/workspace/star-theatre-ref/maps/dpi300/plan-002.jpg',
        'target': 1427,
        'legend_y': 1980,
    },
}

def masks(im):
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    b, g, r = im[:,:,0], im[:,:,1], im[:,:,2]
    white = gray >= 242
    brown = (r > 140) & (g > 80) & (g < 180) & (b < 90)
    cyan = (b > 150) & (g > 140) & (r < 130)
    navy = (b > 80) & (b > g + 15) & (b > r + 15) & (gray < 200) & (gray > 40)
    red = (r > 160) & (g < 90) & (b < 90)
    seat = white | brown | cyan | navy | red
    return gray, white, brown, cyan, navy, red, seat

def door_mask(white, h, w):
    blob = (white.astype(np.uint8)) * 255
    n, lab, st, _ = cv2.connectedComponentsWithStats(blob, 8)
    AREA = cv2.CC_STAT_AREA
    L, T, WW, HH = cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT
    m = np.zeros((h, w), np.uint8)
    boxes = []
    for i in range(1, n):
        area = int(st[i, AREA])
        ww, hh = int(st[i, WW]), int(st[i, HH])
        if 900 <= area <= 2000 and 35 <= ww <= 80 and 35 <= hh <= 80:
            m[lab == i] = 255
            boxes.append((int(st[i, L]), int(st[i, T]), ww, hh, area))
    m = cv2.dilate(m, np.ones((18, 18), np.uint8))
    return m, boxes

def density_peaks(seat, dens_thr, md, legend_y, door):
    dens = cv2.boxFilter(seat.astype(np.float32), -1, (22, 24), normalize=True)
    k = md | 1
    pk = (dens == cv2.dilate(dens, np.ones((k, k), np.uint8))) & (dens >= dens_thr)
    pk[legend_y:] = False
    if door is not None:
        pk[door > 0] = False
    n, lab, st, _ = cv2.connectedComponentsWithStats(pk.astype(np.uint8) * 255, 8)
    L, T, W, H = cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT
    peaks = []
    for i in range(1, n):
        x, y, ww, hh = st[i, L], st[i, T], st[i, W], st[i, H]
        roi = dens[y:y+hh, x:x+ww]
        yy, xx = np.unravel_index(int(np.argmax(roi)), roi.shape)
        cx, cy = int(x + xx), int(y + yy)
        peaks.append((cx, cy, float(dens[cy, cx])))
    return peaks, dens

def extract_seat(cx, cy, seatpix, R=14, area_min=140, area_max=750):
    h, w = seatpix.shape
    x0, y0 = max(0, cx - R), max(0, cy - R)
    x1, y1 = min(w, cx + R + 1), min(h, cy + R + 1)
    local = seatpix[y0:y1, x0:x1].copy()
    yy, xx = np.ogrid[y0-cy:y1-cy, x0-cx:x1-cx]
    disk = ((xx * xx + yy * yy) <= R * R).astype(np.uint8) * 255
    local = cv2.bitwise_and(local, disk)
    inv = cv2.bitwise_not(local)
    ff = inv.copy()
    mask = np.zeros((inv.shape[0] + 2, inv.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 0)
    holes = (ff > 0)
    local = np.clip(local.astype(np.int16) + holes.astype(np.int16) * 255, 0, 255).astype(np.uint8)
    lx = int(np.clip(cx - x0, 0, local.shape[1] - 1))
    ly = int(np.clip(cy - y0, 0, local.shape[0] - 1))
    if local[ly, lx] == 0:
        ys, xs = np.where(local > 0)
        if len(xs) == 0:
            return None
        i = np.argmin((xs - lx) ** 2 + (ys - ly) ** 2)
        if (xs[i] - lx) ** 2 + (ys[i] - ly) ** 2 > 49:
            return None
        lx, ly = int(xs[i]), int(ys[i])
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(local, 4)
    lid = int(lab2[ly, lx])
    if lid == 0:
        return None
    area = int(st2[lid, cv2.CC_STAT_AREA])
    if area < area_min or area > area_max:
        return None
    ys, xs = np.where(lab2 == lid)
    pts = np.column_stack([xs, ys]).astype(np.float32)
    (rcx, rcy), (rw, rh), ang = cv2.minAreaRect(pts)
    a, b = sorted((float(rw), float(rh)))
    if a < 12 or b < 14 or a > 42 or b > 52:
        return None
    gx, gy = float(rcx + x0), float(rcy + y0)
    if rw < rh:
        rot, ww, hh = float(ang - 90), float(rh), float(rw)
    else:
        rot, ww, hh = float(ang), float(rw), float(rh)
    return dict(x=gx, y=gy, w=ww, h=hh, rot=rot, area=area)

def nms(items, r, key=lambda s: s.get('area', 0)):
    items = sorted(items, key=key, reverse=True)
    kept, r2 = [], r * r
    for s in items:
        if all((s['x'] - q['x']) ** 2 + (s['y'] - q['y']) ** 2 >= r2 for q in kept):
            kept.append(s)
    return kept

def classify(s, brown, cyan, navy, red, w, h):
    ix = int(np.clip(round(s['x']), 0, w - 1))
    iy = int(np.clip(round(s['y']), 0, h - 1))
    def patch(m):
        return float(m[max(0, iy - 4):iy + 5, max(0, ix - 4):ix + 5].mean())
    if patch(brown) > 0.12:
        return 'hold'
    if patch(navy) > 0.12:
        return 'emergency'
    if patch(cyan) > 0.12:
        return 'house'
    if patch(red) > 0.12:
        return 'restricted'
    return 'normal'

def extract_level(name, cfg, out_dir='/tmp'):
    im = cv2.imread(cfg['path'])
    H, W = im.shape[:2]
    gray, white, brown, cyan, navy, red, seat = masks(im)
    seatpix = seat.astype(np.uint8) * 255
    doors, door_boxes = door_mask(white, H, W)
    print(f'{name}: image {W}x{H}, door wedges {len(door_boxes)}')

    peaks, dens = density_peaks(seat, 0.58, 16, cfg['legend_y'], doors)
    print(f'{name}: peaks {len(peaks)}')

    raw, fail = [], 0
    for cx, cy, d0 in peaks:
        s = extract_seat(int(cx), int(cy), seatpix)
        if s is None:
            fail += 1
            continue
        s['dens'] = d0
        raw.append(s)
    print(f'{name}: extracted {len(raw)} fail {fail}')
    first = nms(raw, 16)
    print(f'{name}: after nms16 {len(first)}')

    # Gap peaks: lower threshold, not near an existing seat, not in a door
    occ = np.zeros((H, W), np.uint8)
    for s in first:
        cv2.circle(occ, (int(s['x']), int(s['y'])), 16, 1, -1)
    gap_peaks, _ = density_peaks(seat, 0.45, 14, cfg['legend_y'], doors)
    gaps = [(x, y, d) for x, y, d in gap_peaks if occ[y, x] == 0]
    print(f'{name}: gap peaks {len(gaps)}')

    added = []
    for cx, cy, d0 in gaps:
        s = extract_seat(int(cx), int(cy), seatpix, R=15, area_min=100, area_max=800)
        if s is None:
            # accept the peak as a seat with default size if it sits on a seat-coloured pixel
            if not seat[min(H-1, cy), min(W-1, cx)] and dens[cy, cx] < 0.55:
                continue
            s = dict(x=float(cx), y=float(cy), w=25.0, h=23.0, rot=0.0, area=int(dens[cy, cx] * 600), default=True)
        s['dens'] = d0
        added.append(s)
    print(f'{name}: gap accepted {len(added)}')

    merged = nms(first + added, 16)
    # drop anything still inside a door mask or below the legend
    clean = []
    for s in merged:
        x, y = int(round(s['x'])), int(round(s['y']))
        if y >= cfg['legend_y']:
            continue
        if 0 <= y < H and 0 <= x < W and doors[y, x]:
            continue
        s['kind'] = classify(s, brown, cyan, navy, red, W, H)
        s['level'] = name
        clean.append(s)
    print(f'{name}: clean {len(clean)} target {cfg["target"]} delta {len(clean)-cfg["target"]}')
    kinds = {}
    for s in clean:
        kinds[s['kind']] = kinds.get(s['kind'], 0) + 1
    print(f'{name}: kinds {kinds}')

    vis = im.copy()
    cols = {'normal': (0, 0, 255), 'hold': (0, 140, 255), 'house': (255, 180, 0),
            'emergency': (255, 0, 0), 'restricted': (180, 0, 255)}
    for s in clean:
        cv2.circle(vis, (int(s['x']), int(s['y'])), 3, cols[s['kind']], -1)
    scale = 0.32 if H > W else 0.28
    cv2.imwrite(f'{out_dir}/star-{name}-seats.jpg', cv2.resize(vis, (0, 0), fx=scale, fy=scale),
                [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    # regional zooms
    cx0, cy0 = W // 2, int(H * 0.35)
    cv2.imwrite(f'{out_dir}/star-{name}-front.jpg', vis[max(0, cy0-360):cy0+360, max(0, cx0-500):cx0+500],
                [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    cv2.imwrite(f'{out_dir}/star-{name}-left.jpg', vis[200:min(H, 1300), 0:min(W, 950)],
                [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    cv2.imwrite(f'{out_dir}/star-{name}-right.jpg', vis[200:min(H, 1300), max(0, W-950):W],
                [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    cy1 = int(H * 0.68)
    cv2.imwrite(f'{out_dir}/star-{name}-rear.jpg', vis[max(0, cy1-400):min(H, cy1+420), max(0, cx0-550):cx0+550],
                [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    json.dump(clean, open(f'{out_dir}/star-{name}-raw.json', 'w'))
    return clean

def main():
    all_seats = {}
    for name, cfg in PLANS.items():
        all_seats[name] = extract_level(name, cfg)
    print('TOTAL', sum(len(v) for v in all_seats.values()), 'target 5142')
    json.dump({k: v for k, v in all_seats.items()}, open('/tmp/star-all-raw.json', 'w'))

if __name__ == '__main__':
    main()
