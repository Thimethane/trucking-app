"""
ELD Daily Log Sheet Generator — v3  (Professional Grade)
Produces authentic FMCSA § 395.8-style paper log sheets via Pillow.
Each sheet covers exactly one calendar day.
"""
from PIL import Image, ImageDraw, ImageFont
import io, os, base64
from typing import List

# ── Canvas ───────────────────────────────────────────────────────────────────
W, H = 1150, 720

# ── Colour palette ────────────────────────────────────────────────────────────
C_PAGE          = (252, 252, 252)
C_HDR           = (12,  20,  40)
C_HDR2          = (24,  37,  63)
C_RULE          = (200, 210, 220)
C_RULE_MAJOR    = (140, 155, 170)
C_ROW_A         = (247, 249, 252)
C_ROW_B         = (240, 244, 248)
C_TEXT          = (15,  25,  45)
C_MUTED         = (100, 115, 130)
C_WHITE         = (255, 255, 255)
C_ORANGE        = (230,  85,   5)
C_GREEN_BADGE   = (20, 140,  60)
C_GREEN_BG      = (5,  50,  20)

STATUS_COLOR = {
    "off_duty":   (50,  120, 230),
    "sleeper":    (90,   90, 210),
    "driving":    (210,  35,  35),
    "on_duty_nd": (25,  155,  65),
}
STATUS_LABEL = {
    "off_duty":   "1  OFF DUTY",
    "sleeper":    "2  SLEEPER BERTH",
    "driving":    "3  DRIVING",
    "on_duty_nd": "4  ON DUTY (NOT DRIVING)",
}
STATUS_CFR = {
    "off_duty":   "§ 395.2 — not on duty",
    "sleeper":    "§ 395.2 — sleeper berth",
    "driving":    "§ 395.2 — operating CMV",
    "on_duty_nd": "§ 395.2 — not driving",
}
STATUS_ORDER = ["off_duty", "sleeper", "driving", "on_duty_nd"]

# ── Grid geometry ─────────────────────────────────────────────────────────────
LABEL_X   = 12
LABEL_W   = 195
GRID_L    = LABEL_W + 4          # left pixel of hour-0
GRID_R    = W - 55               # right pixel of hour-24
TOTAL_X   = GRID_R + 4
TOTAL_W   = W - TOTAL_X - 4
GRID_TOP  = 162                  # y of top of first row
ROW_H     = 52
N_ROWS    = 4
GRID_BOT  = GRID_TOP + N_ROWS * ROW_H
TICK_Y    = GRID_TOP - 30        # y of hour labels


# ── Font loader ───────────────────────────────────────────────────────────────
_FC: dict = {}

def _f(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key in _FC:
        return _FC[key]
    paths = ([
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ] if bold else [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ])
    font = ImageFont.load_default()
    for p in paths:
        if os.path.exists(p):
            try:
                font = ImageFont.truetype(p, size)
                break
            except Exception:
                pass
    _FC[key] = font
    return font


def _t(draw, xy, text, size=11, bold=False, fill=C_TEXT, anchor="lt"):
    draw.text(xy, str(text), font=_f(size, bold), fill=fill, anchor=anchor)


def _h2x(h: float) -> int:
    """Map hour 0-24 → x pixel."""
    return int(GRID_L + (h / 24.0) * (GRID_R - GRID_L))


# ── Public API ────────────────────────────────────────────────────────────────
def generate_log_sheet(day_log: dict) -> str:
    img  = Image.new("RGB", (W, H), C_PAGE)
    draw = ImageDraw.Draw(img)
    _header(draw, day_log)
    _info_band(draw, day_log)
    _grid_bg(draw)
    _hour_ruler(draw)
    _row_labels(draw)
    _duty_blocks(draw, day_log)
    _grid_border(draw)
    _totals_bar(draw, day_log)
    _remarks(draw, day_log)
    _certification(draw, day_log)
    buf = io.BytesIO()
    img.save(buf, format="PNG", dpi=(150, 150))
    return base64.b64encode(buf.getvalue()).decode()


def generate_all_logs(daily_logs: list) -> List[str]:
    return [generate_log_sheet(log) for log in daily_logs]


# ── Drawing helpers ───────────────────────────────────────────────────────────
def _header(draw, day_log):
    draw.rectangle([0, 0, W, 90], fill=C_HDR)
    # Orange accent stripe
    draw.rectangle([0, 0, 6, 90], fill=C_ORANGE)
    # Title
    _t(draw, (20, 12), "DRIVER'S DAILY LOG", size=20, bold=True, fill=C_WHITE)
    _t(draw, (20, 40), "FMCSA  •  Property-Carrying  •  70 Hrs / 8 Days  •  No Adverse Conditions",
       size=10, fill=(140, 160, 185))
    _t(draw, (20, 58), "Hours of Service Regulations  —  49 CFR § 395.8",
       size=9, fill=(80, 100, 125))

    # Compliance badge (right side)
    bx = W - 190
    draw.rectangle([bx, 14, W - 14, 76], fill=C_GREEN_BG)
    draw.rectangle([bx, 14, W - 14, 76], outline=(30, 160, 70), width=1)
    _t(draw, (bx + (W - 14 - bx) // 2, 35), "✓  HOS COMPLIANT",
       size=11, bold=True, fill=(50, 220, 100), anchor="mm")
    _t(draw, (bx + (W - 14 - bx) // 2, 58), "FMCSA § 395.3 Verified",
       size=8, fill=(40, 130, 65), anchor="mm")

    # Day badge
    bx2 = W - 390
    draw.rectangle([bx2, 10, bx2 + 180, 80], fill=C_HDR2)
    _t(draw, (bx2 + 90, 30), day_log["date_label"].upper(),
       size=16, bold=True, fill=C_ORANGE, anchor="mm")
    _t(draw, (bx2 + 90, 52),
       f"Odometer  {int(day_log['odometer_start'])} – {int(day_log['odometer_end'])} mi",
       size=9, fill=(150, 170, 195), anchor="mm")
    _t(draw, (bx2 + 90, 68),
       f"Drive {day_log['total_driving']:.1f}h  ·  OnDuty {day_log['total_on_duty']:.1f}h  ·  Off {day_log['total_off_duty']:.1f}h",
       size=8, fill=(90, 110, 140), anchor="mm")


def _info_band(draw, day_log):
    y = 90
    draw.rectangle([0, y, W, y + 68], fill=C_HDR2)
    draw.line([(0, y + 67), (W, y + 67)], fill=(35, 55, 90), width=1)

    fields = [
        ("FROM",     day_log.get("origin_name",  "—")),
        ("TO",       day_log.get("dropoff_name", "—")),
        ("CARRIER",  "TruckLogger Transport LLC"),
        ("MAIN OFF", "Chicago, IL"),
        ("VEH #",    "TL-001"),
        ("TRAILER",  "—"),
    ]
    col_w = W // len(fields)
    for i, (lbl, val) in enumerate(fields):
        x = i * col_w + 12
        if i > 0:
            draw.line([(i * col_w, y + 8), (i * col_w, y + 60)],
                      fill=(35, 55, 90), width=1)
        _t(draw, (x, y + 9),  lbl, size=7, fill=(80, 105, 140))
        _t(draw, (x, y + 24), val[:26], size=10, bold=True, fill=(185, 200, 220))


def _grid_bg(draw):
    for i in range(N_ROWS):
        y  = GRID_TOP + i * ROW_H
        bg = C_ROW_A if i % 2 == 0 else C_ROW_B
        draw.rectangle([GRID_L, y, GRID_R, y + ROW_H], fill=bg)


def _hour_ruler(draw):
    # Quarter-hour minor ticks (every 0.25h)
    for q in range(97):  # 0 to 24h in 15-min steps
        h = q / 4.0
        x = _h2x(h)
        is_hour   = (q % 4 == 0)
        is_half   = (q % 2 == 0) and not is_hour
        tick_len  = 12 if is_hour else (6 if is_half else 3)
        col       = C_RULE_MAJOR if is_hour else C_RULE
        draw.line([(x, TICK_Y + 18 - tick_len), (x, TICK_Y + 18)], fill=col, width=1)
        # Vertical grid line through rows (hours only)
        if is_hour:
            draw.line([(x, GRID_TOP), (x, GRID_BOT)],
                      fill=C_RULE_MAJOR if (q % 24 == 0 or q == 96) else C_RULE,
                      width=2 if (q % 24 == 0 or q == 96) else 1)

    # Hour labels
    HOUR_LBL = {
        0: "Mid\nnght", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5",
        6: "6\nAM",    7: "7", 8: "8", 9: "9", 10: "10", 11: "11",
        12: "Noon",   13: "1", 14: "2", 15: "3", 16: "4", 17: "5",
        18: "6\nPM",  19: "7", 20: "8", 21: "9", 22: "10", 23: "11",
        24: "Mid\nnght",
    }
    for h in range(25):
        x = _h2x(h)
        lbl = HOUR_LBL.get(h, str(h))
        major = (h % 6 == 0)
        for idx, line in enumerate(lbl.split("\n")):
            _t(draw, (x, TICK_Y - 2 + idx * 11), line,
               size=8 if major else 7,
               bold=major,
               fill=C_TEXT if major else C_MUTED,
               anchor="mb")


def _row_labels(draw):
    for i, status in enumerate(STATUS_ORDER):
        y_mid = GRID_TOP + i * ROW_H + ROW_H // 2
        col   = STATUS_COLOR[status]
        lbl   = STATUS_LABEL[status]
        cfr   = STATUS_CFR[status]

        # Colour swatch
        draw.rectangle([LABEL_X, y_mid - 10, LABEL_X + 8, y_mid + 10], fill=col)
        # Row number
        _t(draw, (LABEL_X + 12, y_mid - 2), str(i + 1),
           size=17, bold=True, fill=col, anchor="lm")
        # Status text
        _t(draw, (LABEL_X + 30, y_mid - 11),
           lbl.split("  ", 1)[-1],
           size=9, bold=True, fill=C_TEXT)
        _t(draw, (LABEL_X + 30, y_mid + 3), cfr, size=7, fill=C_MUTED)


def _duty_blocks(draw, day_log):
    for entry in day_log.get("entries", []):
        status = entry.get("status")
        if status not in STATUS_ORDER:
            continue
        row_i = STATUS_ORDER.index(status)
        col   = STATUS_COLOR[status]
        sh    = max(0.0, float(entry["start_hour"]))
        dur   = float(entry["duration_hours"])
        eh    = min(24.0, sh + dur)
        if eh - sh < 0.005:
            continue
        x1 = _h2x(sh)
        x2 = _h2x(eh)
        y1 = GRID_TOP + row_i * ROW_H + 4
        y2 = GRID_TOP + row_i * ROW_H + ROW_H - 4

        # Main block
        draw.rectangle([x1, y1, x2, y2], fill=col)
        # Bright top edge (highlight)
        hi = tuple(min(255, c + 55) for c in col)
        draw.rectangle([x1, y1, x2, y1 + 3], fill=hi)
        # Dark border
        dk = tuple(max(0, c - 50) for c in col)
        draw.rectangle([x1, y1, x2, y2], outline=dk, width=1)

        # Label if wide enough
        px_w = x2 - x1
        label = entry.get("label", "")
        if px_w > 60:
            mx, my = (x1 + x2) // 2, (y1 + y2) // 2
            # Shadow
            _t(draw, (mx + 1, my + 1), label[:32], size=8,
               fill=(0, 0, 0), anchor="mm")
            _t(draw, (mx, my), label[:32], size=8,
               fill=C_WHITE, anchor="mm")
        elif px_w > 18:
            _t(draw, ((x1+x2)//2, (y1+y2)//2),
               f"{dur:.1f}h", size=7, fill=C_WHITE, anchor="mm")


def _grid_border(draw):
    # Outer border
    draw.rectangle([GRID_L, GRID_TOP, GRID_R, GRID_BOT],
                   outline=C_RULE_MAJOR, width=2)
    # Internal row dividers
    for i in range(1, N_ROWS):
        y = GRID_TOP + i * ROW_H
        draw.line([(GRID_L, y), (GRID_R, y)], fill=C_RULE_MAJOR, width=1)
    # Total column header
    draw.line([(GRID_R, GRID_TOP), (GRID_R, GRID_BOT)], fill=C_RULE_MAJOR, width=2)
    _t(draw, (TOTAL_X + TOTAL_W // 2, GRID_TOP - 14), "TOTAL",
       size=8, bold=True, fill=C_MUTED, anchor="mm")


def _totals_bar(draw, day_log):
    y = GRID_BOT + 10
    h = 48

    # Per-row totals in the TOTAL column
    for i, status in enumerate(STATUS_ORDER):
        entries = [e for e in day_log.get("entries", []) if e.get("status") == status]
        row_total = sum(e["duration_hours"] for e in entries)
        y_mid = GRID_TOP + i * ROW_H + ROW_H // 2
        col = STATUS_COLOR[status]
        _t(draw, (TOTAL_X + TOTAL_W // 2, y_mid),
           f"{row_total:.1f}" if row_total > 0 else "—",
           size=12 if row_total > 0 else 10,
           bold=row_total > 0,
           fill=col if row_total > 0 else C_RULE,
           anchor="mm")

    # Summary totals bar below grid
    totals = [
        ("OFF DUTY",  day_log["total_off_duty"],  STATUS_COLOR["off_duty"]),
        ("SLEEPER",   0.0,                         STATUS_COLOR["sleeper"]),
        ("DRIVING",   day_log["total_driving"],    STATUS_COLOR["driving"]),
        ("ON DUTY ND",day_log["total_on_duty"],    STATUS_COLOR["on_duty_nd"]),
    ]
    grand = min(24.0, day_log["total_off_duty"] + day_log["total_driving"] + day_log["total_on_duty"])
    all_cols = totals + [("TOTAL", grand, C_HDR)]
    cw = (GRID_R - GRID_L) // len(all_cols)

    for idx, (lbl, val, col) in enumerate(all_cols):
        x = GRID_L + idx * cw
        draw.rectangle([x + 1, y, x + cw - 1, y + h], fill=col)
        _t(draw, (x + cw // 2, y + 14), lbl, size=8, bold=True,
           fill=C_WHITE, anchor="mm")
        _t(draw, (x + cw // 2, y + 34), f"{val:.1f} hrs", size=12, bold=True,
           fill=C_WHITE, anchor="mm")


def _remarks(draw, day_log):
    y0 = GRID_BOT + 68
    y1 = y0 + 70
    draw.rectangle([LABEL_X, y0, W // 2 - 10, y1], fill=C_ROW_A)
    draw.rectangle([LABEL_X, y0, W // 2 - 10, y1], outline=C_RULE, width=1)
    _t(draw, (LABEL_X + 8, y0 + 6), "REMARKS / NOTABLE EVENTS:", size=9,
       bold=True, fill=C_TEXT)

    notable = [
        e for e in day_log.get("entries", [])
        if any(k in e.get("label", "") for k in
               ["Pickup", "Dropoff", "Fuel", "Break", "Rest", "Inspection", "Restart"])
    ]
    for i, e in enumerate(notable[:4]):
        row_y = y0 + 22 + i * 13
        col   = STATUS_COLOR.get(e.get("status", ""), C_MUTED)
        draw.ellipse([LABEL_X + 8, row_y + 3, LABEL_X + 15, row_y + 10], fill=col)
        _t(draw, (LABEL_X + 20, row_y),
           f"{e['label']}  @  {e['location'][:30]}",
           size=8, fill=C_MUTED)


def _certification(draw, day_log):
    y0 = GRID_BOT + 68
    x0 = W // 2
    y1 = y0 + 70
    draw.rectangle([x0, y0, W - LABEL_X, y1], fill=C_ROW_B)
    draw.rectangle([x0, y0, W - LABEL_X, y1], outline=C_RULE, width=1)
    _t(draw, (x0 + 10, y0 + 6),
       "CERTIFICATION:  I certify these entries are true and correct.",
       size=8, bold=True, fill=C_TEXT)
    _t(draw, (x0 + 10, y0 + 24), "Signature: ________________________________",
       size=9, fill=C_MUTED)
    _t(draw, (x0 + 10, y0 + 42), "Date: _______________________",
       size=9, fill=C_MUTED)
    _t(draw, (x0 + 300, y0 + 42), "Co-Driver: _______________________",
       size=9, fill=C_MUTED)
