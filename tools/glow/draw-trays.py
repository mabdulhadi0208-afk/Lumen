#!/usr/bin/env python3
"""Draws the Nova menu-bar (tray) icons for Surge and Koi into tools/glow/tray/. Run it once after changing a design;
tools/import-apps.py copies the results into apps/. Everything is drawn 16x oversize and scaled down, so the edges are
crisp at 1x and 2x.
  Surge (macOS): surgeTemplate.png / @2x, 18pt: a rounded bolt inside an orbit ring with a spark, a template image.
  Surge (Windows tray): bolt.png and the battery set b0..b100 (+ c while charging), 32px, white for a dark taskbar.
  Koi (macOS): trayFrame0..6Template.png / @2x, 22pt: a koi whose tail fans open over the 7 frames (the fan opening).
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tray'); os.makedirs(OUT, exist_ok=True)
SS = 16

def rounded(mask, r):
    """round every corner of a shape mask by r (in big pixels)"""
    if r <= 0: return mask
    return mask.filter(ImageFilter.GaussianBlur(r)).point(lambda v: 255 if v > 127 else 0)

def finish(mask, size, color=(0, 0, 0)):
    m = mask.resize((size, size), Image.LANCZOS)
    im = Image.new('RGBA', (size, size), color + (0,)); im.putalpha(m); return im

BOLT = [(13, 2), (4, 14), (11, 14), (10, 22), (19, 10), (12, 10)]   # on a 24 grid

def bolt_poly(cx, cy, s):
    return [(cx + (x - 11.5) * s, cy + (y - 12) * s) for x, y in BOLT]

# ---------------------------------------------------------------- Surge, macOS template
def surge_template(pt):
    N = pt * SS; W = N
    m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    c = W / 2
    # orbit ring with a gap at the top right where the spark sits
    ring = Image.new('L', (W, W), 0); rd = ImageDraw.Draw(ring)
    R, th = W * .46, W * .085
    rd.arc([c - R, c - R, c + R, c + R], start=-20, end=290, fill=255, width=int(th))
    # rounded caps on the ring ends
    for a in (-20, 290):
        x, y = c + (R - th / 2) * math.cos(math.radians(a)), c + (R - th / 2) * math.sin(math.radians(a))
        rd.ellipse([x - th / 2, y - th / 2, x + th / 2, y + th / 2], fill=255)
    m.paste(255, mask=ring)
    # the bolt, rounded, with a clear moat so it reads as one piece at 18pt
    b = Image.new('L', (W, W), 0); ImageDraw.Draw(b).polygon(bolt_poly(c, c + W * .01, W / 24 * .74), fill=255); b = rounded(b, W * .018)
    moat = b.filter(ImageFilter.MaxFilter(int(W * .05) | 1))
    m.paste(0, mask=moat); m.paste(255, mask=b)
    # the spark: a four-point star in the ring's gap
    sx, sy, sr = c + R * .74, c - R * .74, W * .13
    star = [(sx, sy - sr), (sx + sr * .26, sy - sr * .26), (sx + sr, sy), (sx + sr * .26, sy + sr * .26), (sx, sy + sr), (sx - sr * .26, sy + sr * .26), (sx - sr, sy), (sx - sr * .26, sy - sr * .26)]
    ImageDraw.Draw(m).polygon(star, fill=255)
    return finish(m, pt)

# ---------------------------------------------------------------- Surge, Windows tray (white, 32px)
WHITE = (255, 255, 255)
def win_bolt():
    W = 32 * SS; m = Image.new('L', (W, W), 0)
    ImageDraw.Draw(m).polygon(bolt_poly(W / 2, W / 2, W / 24 * .95), fill=255); m = rounded(m, W * .02)
    return finish(m, 32, WHITE)

def win_battery(level, charging):
    W = 32 * SS; m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    x0, y0, x1, y1, r, t = W * .06, W * .27, W * .86, W * .73, W * .13, W * .065
    d.rounded_rectangle([x0, y0, x1, y1], r, fill=255)
    d.rounded_rectangle([x0 + t, y0 + t, x1 - t, y1 - t], r - t, fill=0)
    d.rounded_rectangle([x1 + W * .03, W * .41, x1 + W * .1, W * .59], W * .03, fill=255)   # the nub
    g = t * .85; fx0, fy0, fx1, fy1 = x0 + t + g, y0 + t + g, x1 - t - g, y1 - t - g
    fw = max(W * .03, (fx1 - fx0) * level / 100)
    fill = Image.new('L', (W, W), 0); ImageDraw.Draw(fill).rounded_rectangle([fx0, fy0, fx0 + fw, fy1], (r - t - g) * .9, fill=255)
    col = Image.new('RGBA', (W, W), (255, 255, 255, 0))
    low = level <= 20 and not charging
    shade = (255, 92, 110) if low else (255, 255, 255)
    if charging:
        b = Image.new('L', (W, W), 0); ImageDraw.Draw(b).polygon(bolt_poly(W * .46, W / 2, W / 24 * .62), fill=255); b = rounded(b, W * .012)
        fill.paste(0, mask=b.filter(ImageFilter.MaxFilter(int(W * .06) | 1)))
        m.paste(0, mask=b.filter(ImageFilter.MaxFilter(int(W * .06) | 1))); m.paste(255, mask=b)
    body = finish(m, 32, WHITE)
    lv = Image.new('RGBA', (32, 32), shade + (0,)); lv.putalpha(fill.resize((32, 32), Image.LANCZOS).point(lambda v: int(v * .95)))
    body.alpha_composite(lv); return body

# ---------------------------------------------------------------- Koi, macOS template frames
def koi_frame(pt, k):
    """frame k of 7: the tail fans open from a single fin (0) to a full fan of five (6)"""
    W = pt * SS; m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    e = 1 - (1 - k / 6) ** 2                     # ease out, like the fan itself
    # body: a round-nosed koi facing left, tapering to the tail
    x0, x1, cy, hm = W * .04, W * .6, W * .5, W * .21
    top, bot = [], []
    for i in range(61):
        t = i / 60; h = hm * min(1, (t / .3)) ** .5 * (1 - t) ** .75 + W * .025 * t
        x = x0 + (x1 - x0) * t; top.append((x, cy - h)); bot.append((x, cy + h * .92))
    d.polygon(top + bot[::-1], fill=255)
    m = rounded(m, W * .012); d = ImageDraw.Draw(m)
    hx, hy, br = W * .2, W * .5, W * .2
    root = (W * .6, W * .5)
    # tail fins: rounded petals on a fan; spread grows with the frame
    n = 1 + round(e * 4)
    spread = math.radians(8 + 104 * e)
    fin = Image.new('L', (W, W), 0); fd = ImageDraw.Draw(fin)
    for j in range(n):
        a = 0 if n == 1 else -spread / 2 + spread * j / (n - 1)
        L, w = 0, W * (.12 if n > 1 else .15)
        L = W * .33
        tip = (root[0] + math.cos(a) * L, root[1] + math.sin(a) * L)
        nx, ny = -math.sin(a), math.cos(a)
        base = (root[0] + math.cos(a) * W * .06, root[1] + math.sin(a) * W * .06)
        poly = [(base[0] + nx * w * .25, base[1] + ny * w * .25), (tip[0] + nx * w * .55, tip[1] + ny * w * .55), (tip[0] - nx * w * .55, tip[1] - ny * w * .55), (base[0] - nx * w * .25, base[1] - ny * w * .25)]
        fd.polygon(poly, fill=255); fd.ellipse([tip[0] - w * .55, tip[1] - w * .55, tip[0] + w * .55, tip[1] + w * .55], fill=255)
    fin = rounded(fin, W * .01)
    # a thin moat between the fins and the body so each reads on its own
    moat = fin.filter(ImageFilter.MaxFilter(int(W * .045) | 1))
    m.paste(0, mask=moat); m.paste(255, mask=fin)
    # the pivot: a small bead where the fan turns (Koi's mark), with a moat
    pr = W * .055; pv = Image.new('L', (W, W), 0); ImageDraw.Draw(pv).ellipse([root[0] - pr, root[1] - pr, root[0] + pr, root[1] + pr], fill=255)
    m.paste(0, mask=pv.filter(ImageFilter.MaxFilter(int(W * .05) | 1))); m.paste(255, mask=pv)
    # eye: cut out of the head
    er = W * .045; ex, ey = W * .15, W * .44
    ImageDraw.Draw(m).ellipse([ex - er, ey - er, ex + er, ey + er], fill=0)
    return finish(m, pt)

if __name__ == '__main__':
    surge_template(18).save(os.path.join(OUT, 'surgeTemplate.png')); surge_template(36).save(os.path.join(OUT, 'surgeTemplate@2x.png'))
    win_bolt().save(os.path.join(OUT, 'bolt.png'))
    for lv in range(0, 101, 10):
        win_battery(lv, False).save(os.path.join(OUT, f'b{lv}.png')); win_battery(lv, True).save(os.path.join(OUT, f'b{lv}c.png'))
    for k in range(7):
        koi_frame(22, k).save(os.path.join(OUT, f'trayFrame{k}Template.png')); koi_frame(44, k).save(os.path.join(OUT, f'trayFrame{k}Template@2x.png'))
    print('drew tray icons into', OUT)
