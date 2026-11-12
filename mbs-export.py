#!/usr/bin/env python3
"""Export the approved Sands Theatre layout as interactive plan data."""
from __future__ import annotations

import importlib.util
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("layout", os.path.join(ROOT, "mbs-layout.py"))
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)

LEVELS = {
    "stalls": {
        "id": "stalls",
        "name": "Stalls",
        "subtitle": "1,238 seats, including 71 on the orchestra pit lift",
    },
    "dress": {
        "id": "dress",
        "name": "Dress Circle",
        "subtitle": "177 seats, including boxes 1 to 6",
    },
    "grand": {
        "id": "grand",
        "name": "Grand Circle",
        "subtitle": "740 seats, including boxes 7 and 8",
    },
}

# Panel geometry matches build_level() in mbs-layout.py
W, H = 1600, 1880
PX, PY, PW, PH = 40, 24, W - 80, 1820

CTX = {"level": None, "row": None, "box": None, "seat_n": 0, "wheel_n": 0}
SEATS: list[dict] = []
_orig_emit = layout.emit_seat


def begin_row(level: str, row: str) -> None:
    CTX.update(level=level, row=row, box=None, seat_n=0, wheel_n=0)


def begin_box(level: str, box: str) -> None:
    CTX.update(level=level, row=None, box=str(box), seat_n=0, wheel_n=0)


def emit_seat(x, y, rot, seat_w, seat_h, kind):
    el, x, y = _orig_emit(x, y, rot, seat_w, seat_h, kind)
    level = CTX["level"]
    if level:
        rec = {
            "x": round(x, 2),
            "y": round(y, 2),
            "rot": round(rot, 2),
            "w": round(seat_w, 2),
            "h": round(seat_h, 2),
            "kind": kind,
            "level": level,
        }
        if kind == "wheel":
            CTX["wheel_n"] += 1
            rec["row"] = CTX["row"]
            rec["space"] = CTX["wheel_n"]
            rec["id"] = f"{level}.{CTX['row']}.W{rec['space']}"
        elif CTX["box"]:
            CTX["seat_n"] += 1
            rec["box"] = CTX["box"]
            rec["num"] = CTX["seat_n"]
            rec["id"] = f"{level}.Box{CTX['box']}.{rec['num']}"
        else:
            CTX["seat_n"] += 1
            rec["row"] = CTX["row"]
            rec["num"] = CTX["seat_n"]
            rec["id"] = f"{level}.{CTX['row']}.{rec['num']}"
        SEATS.append(rec)
    return el, x, y


layout.emit_seat = emit_seat


# Hook the row/box context into the existing draw loops by wrapping place_* and
# intercepting the loops via patched helpers used at the start of each row.
_orig_place_three = layout.place_three_block
_orig_place_cont = layout.place_continuous


def place_three_block(cx, y_base, k, left_n, cen_n, right_n, seat_w, seat_h,
                      pitch, aisle, special, kind="normal",
                      left_gaps=None, cen_gaps=None, right_gaps=None,
                      left_bay=None, cen_bay=None, right_bay=None):
    return _orig_place_three(
        cx, y_base, k, left_n, cen_n, right_n, seat_w, seat_h,
        pitch, aisle, special, kind, left_gaps, cen_gaps, right_gaps,
        left_bay, cen_bay, right_bay,
    )


layout.place_three_block = place_three_block
layout.place_continuous = _orig_place_cont


def wrap_draw_stalls():
    orig = layout.draw_stalls_content

    def draw_stalls_content(svg, ox, oy, pw, ph, seat_w=9.4, seat_h=8.6, compact=False):
        # Shadow the loop by temporarily wrapping place_three_block with row names.
        # We know the loop order equals STALLS non-None items.
        rows = [item for item in layout.STALLS if item]
        idx = {"i": 0}
        inner = layout.place_three_block

        def hooked(*args, **kwargs):
            name = rows[idx["i"]][0]
            begin_row("stalls", name)
            idx["i"] += 1
            return inner(*args, **kwargs)

        layout.place_three_block = hooked
        try:
            return orig(svg, ox, oy, pw, ph, seat_w=seat_w, seat_h=seat_h, compact=compact)
        finally:
            layout.place_three_block = inner

    layout.draw_stalls_content = draw_stalls_content


def wrap_draw_dress():
    orig = layout.draw_dress_content
    orig_emit = None  # emit already records; we need begin_row / begin_box around calls

    def draw_dress_content(svg, ox, oy, pw, ph, seat_w=12.4, seat_h=10.8):
        rows = list(layout.DRESS)
        idx = {"i": 0}
        inner_three = layout.place_three_block
        inner_emit = layout.emit_seat
        box_order = {"n": 0}
        # Dress boxes: emit_seat is called 4 times per box, 6 boxes.
        # Detect box seats by kind=="box". We set context based on call groups.
        # Safer: hook emit_seat to start a box every 4 box seats if no row context from place_three.
        names = {("L", 0): "6", ("L", 1): "5", ("L", 2): "4",
                 ("R", 0): "1", ("R", 1): "2", ("R", 2): "3"}
        # The original draws L then R, gi 0..2 — same as names keys in that order.
        box_seq = [names[("L", gi)] for gi in range(3)] + [names[("R", gi)] for gi in range(3)]
        box_state = {"i": 0, "count": 0, "started": False}

        def hooked_three(*args, **kwargs):
            name = rows[idx["i"]][0]
            begin_row("dress", name)
            idx["i"] += 1
            return inner_three(*args, **kwargs)

        def hooked_emit(x, y, rot, seat_w, seat_h, kind):
            if kind == "box":
                if box_state["count"] % 4 == 0:
                    begin_box("dress", box_seq[box_state["i"]])
                    box_state["i"] += 1
                box_state["count"] += 1
            return inner_emit(x, y, rot, seat_w, seat_h, kind)

        layout.place_three_block = hooked_three
        layout.emit_seat = hooked_emit
        try:
            return orig(svg, ox, oy, pw, ph, seat_w=seat_w, seat_h=seat_h)
        finally:
            layout.place_three_block = inner_three
            layout.emit_seat = inner_emit

    layout.draw_dress_content = draw_dress_content


def wrap_draw_grand():
    orig = layout.draw_grand_content

    def draw_grand_content(svg, ox, oy, pw, ph, seat_w=10.2, seat_h=9.0):
        af = list(layout.GRAND_AF)
        gs = list(layout.GRAND_GS)
        three_i = {"i": 0}
        cont_i = {"i": 0}
        inner_three = layout.place_three_block
        inner_cont = layout.place_continuous
        inner_emit = layout.emit_seat
        # Boxes 8 (left) then 7 (right), 4 seats each, drawn before rows
        box_seq = ["8", "7"]
        box_state = {"i": 0, "count": 0}

        def hooked_three(*args, **kwargs):
            name = af[three_i["i"]][0]
            begin_row("grand", name)
            three_i["i"] += 1
            return inner_three(*args, **kwargs)

        def hooked_cont(*args, **kwargs):
            name = gs[cont_i["i"]][0]
            begin_row("grand", name)
            cont_i["i"] += 1
            return inner_cont(*args, **kwargs)

        def hooked_emit(x, y, rot, seat_w, seat_h, kind):
            if kind == "box":
                if box_state["count"] % 4 == 0:
                    begin_box("grand", box_seq[box_state["i"]])
                    box_state["i"] += 1
                box_state["count"] += 1
            return inner_emit(x, y, rot, seat_w, seat_h, kind)

        layout.place_three_block = hooked_three
        layout.place_continuous = hooked_cont
        layout.emit_seat = hooked_emit
        try:
            return orig(svg, ox, oy, pw, ph, seat_w=seat_w, seat_h=seat_h)
        finally:
            layout.place_three_block = inner_three
            layout.place_continuous = inner_cont
            layout.emit_seat = inner_emit

    layout.draw_grand_content = draw_grand_content


wrap_draw_stalls()
wrap_draw_dress()
wrap_draw_grand()


class RecordingSVG(layout.SVG):
    """Record decoration primitives; drop seat <g> groups."""

    def __init__(self, w, h, bg=layout.BG):
        super().__init__(w, h, bg)
        self.deco: list[str] = []
        self._recording = False

    def start(self):
        # Keep defs + background rect from the constructor, then record additions
        self.deco = []
        self._recording = True

    def add(self, s):
        super().add(s)
        if not self._recording:
            return
        t = s.lstrip()
        if t.startswith("<g transform=\"translate") or t.startswith("<g>"):
            return
        self.deco.append(s)


def build_level_plan(kind: str) -> dict:
    global SEATS
    SEATS = []
    CTX.update(level=None, row=None, box=None, seat_n=0, wheel_n=0)
    svg = RecordingSVG(W, H)
    # Do not include the draft header/footer; start recording at the panel
    svg.start()
    content_y = layout.draw_panel_frame(svg, PX, PY, PW, PH, LEVELS[kind]["name"], LEVELS[kind]["subtitle"])
    ox, oy = PX + 16, content_y
    cw, ch = PW - 32, PH - (content_y - PY) - 20
    if kind == "stalls":
        layout.draw_stalls_content(svg, ox, oy, cw, ch, seat_w=11.2, seat_h=9.8, compact=False)
    elif kind == "dress":
        layout.draw_dress_content(svg, ox, oy, cw, ch, seat_w=14.2, seat_h=12.2)
    else:
        layout.draw_grand_content(svg, ox, oy, cw, ch, seat_w=11.6, seat_h=10.0)

    # Seats drawn on this level (exclude wheelchair from sold count, but keep them in the list)
    level_seats = [s for s in SEATS if s["level"] == kind]
    sold = [s for s in level_seats if s["kind"] != "wheel"]
    wheels = [s for s in level_seats if s["kind"] == "wheel"]
    # Constructor writes the <defs> block and the vignette background; keep them
    # so the live canvas can paint the approved gold proscenium and stage.
    raw = "\n".join(svg.parts)
    defs_start = raw.find("<defs>")
    defs_end = raw.find("</defs>") + len("</defs>")
    defs = raw[defs_start:defs_end] if defs_start != -1 else ""
    bg = f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>'
    return {
        **LEVELS[kind],
        "width": W,
        "height": H,
        "defs": defs,
        "background": bg,
        "decorations": svg.deco,
        "seats": level_seats,
        "sold": len(sold),
        "wheelchair": len(wheels),
        "pit": sum(1 for s in sold if s["kind"] == "pit"),
        "box": sum(1 for s in sold if s["kind"] == "box"),
    }


def main():
    levels = {}
    for kind in ("stalls", "dress", "grand"):
        levels[kind] = build_level_plan(kind)
        print(
            f"{kind}: sold={levels[kind]['sold']} wheel={levels[kind]['wheelchair']} "
            f"pit={levels[kind]['pit']} box={levels[kind]['box']} deco={len(levels[kind]['decorations'])}"
        )

    sold_total = sum(lv["sold"] for lv in levels.values())
    assert levels["stalls"]["sold"] == 1238, levels["stalls"]["sold"]
    assert levels["dress"]["sold"] == 177, levels["dress"]["sold"]
    assert levels["grand"]["sold"] == 740, levels["grand"]["sold"]
    assert sold_total == 2155, sold_total
    assert levels["stalls"]["pit"] == 71, levels["stalls"]["pit"]
    assert levels["dress"]["box"] == 24, levels["dress"]["box"]
    assert levels["grand"]["box"] == 8, levels["grand"]["box"]
    ids = [s["id"] for lv in levels.values() for s in lv["seats"]]
    assert len(ids) == len(set(ids)), "duplicate ids"

    plan = {
        "title": "Sands Theatre, Marina Bay Sands",
        "total": 2155,
        "published": 2173,
        "defs": {
            "font": layout.FONT,
            "bg": layout.BG,
            "bg2": layout.BG2,
            "panel": layout.PANEL,
            "panelEdge": layout.PANEL_EDGE,
            "seat": layout.SEAT,
            "seatBack": layout.SEAT_BACK,
            "seatLit": layout.SEAT_LIT,
            "pitSeat": layout.PIT_SEAT,
            "pitBack": layout.PIT_BACK,
            "boxFill": layout.BOX_FILL,
            "boxBack": layout.BOX_BACK,
            "boxStroke": layout.BOX_STROKE,
            "gold": layout.GOLD,
            "goldDim": layout.GOLD_DIM,
            "goldSoft": layout.GOLD_SOFT,
            "ivory": layout.IVORY,
            "ivoryDim": layout.IVORY_DIM,
            "muted": layout.MUTED,
            "wheelStroke": layout.WHEEL_STROKE,
        },
        "levels": levels,
    }
    out = os.path.join(ROOT, "mbs-plan.json")
    with open(out, "w") as f:
        json.dump(plan, f, separators=(",", ":"))
    print(f"wrote {out} ({os.path.getsize(out):,} bytes)")


if __name__ == "__main__":
    main()
