#!/usr/bin/env python3
"""Lumen 4.5 app icon: a monochrome mark on a squircle (no gradients beyond a faint tonal one, no colour).

The mark: an aperture, a thin ring, with a crescent of light inside it: the lit edge of a disc, the idea of "lumen".
Writes build/icon.png (1024), build/icon.svg, build/icons/<id>.png (512), pages/icon-<id>.png (96),
build/nsis/*.ico and a preview strip. Run: python3 build/make-icon.py [preview.png]
Each icon choice is the same mark in a different quiet tone: ink, paper, slate, stone and so on.
"""
import math, sys, os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# id: (background top, background bottom, mark) - a faint tonal shift only
TONES = {
    'default':  ('#1d1b18', '#121110', '#f4efe5'),   # paper on ink
    'mono':     ('#f8f5ef', '#ece7dd', '#15130f'),   # ink on paper
    'midnight': ('#1a1f2b', '#10141c', '#e9ebf0'),   # paper on slate night
    'mint':     ('#163d31', '#0e2a22', '#efe9dc'),   # paper on deep emerald
    'ocean':    ('#27323a', '#1b242a', '#eef0ee'),   # paper on deep slate
    'gold':     ('#e9dfcb', '#dccfb5', '#1c1813'),   # ink on sand
    'rose':     ('#efe2dc', '#e2d0c8', '#22181a'),   # ink on clay
    'sunset':   ('#3a2a20', '#2a1e17', '#f2e8da'),   # paper on bronze
}

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def squircle(n, size, inset, power=5.0):
    c = size / 2; r = size / 2 - inset; pts = []
    for i in range(n):
        t = 2 * math.pi * i / n; ct, st = math.cos(t), math.sin(t)
        x = c + r * math.copysign(abs(ct) ** (2 / power), ct); y = c + r * math.copysign(abs(st) ** (2 / power), st)
        pts.append((x, y))
    return pts

def render(tone, S=1024, inset_ratio=100 / 1024):
    top, bot, mark = (hexrgb(x) for x in TONES[tone])
    K = 4; W = S * K
    # tonal background (vertical, barely there)
    bg = Image.new('RGBA', (W, W))
    d = ImageDraw.Draw(bg)
    for y in range(W):
        f = y / (W - 1); d.line([(0, y), (W, y)], fill=tuple(round(top[i] + (bot[i] - top[i]) * f) for i in range(3)) + (255,))
    mask = Image.new('L', (W, W), 0); ImageDraw.Draw(mask).polygon(squircle(720, W, W * inset_ratio), fill=255)
    out = Image.new('RGBA', (W, W), (0, 0, 0, 0)); out.paste(bg, (0, 0), mask)
    # the mark
    m = Image.new('L', (W, W), 0); md = ImageDraw.Draw(m)
    cx = cy = W / 2; R = W * 0.255; ring = W * 0.018
    md.ellipse([cx - R, cy - R, cx + R, cy + R], outline=255, width=round(ring))
    # crescent: an inner disc minus the same disc shifted towards the upper right
    r2 = R * 0.74
    disc = Image.new('L', (W, W), 0); ImageDraw.Draw(disc).ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=255)
    off = r2 * 0.42; ox, oy = off * math.cos(math.radians(-38)), off * math.sin(math.radians(-38))
    cut = Image.new('L', (W, W), 0); ImageDraw.Draw(cut).ellipse([cx - r2 + ox, cy - r2 + oy, cx + r2 + ox, cy + r2 + oy], fill=255)
    cres = Image.composite(Image.new('L', (W, W), 0), disc, cut)
    m = Image.composite(Image.new('L', (W, W), 255), m, cres)
    m = Image.composite(m, Image.new('L', (W, W), 0), mask)
    out.paste(Image.new('RGBA', (W, W), mark + (255,)), (0, 0), m)
    # one hairline round the squircle for the light tones, so they hold their edge on a light dock
    if sum(top) > 600:
        edge = Image.new('L', (W, W), 0); ed = ImageDraw.Draw(edge); ed.polygon(squircle(720, W, W * inset_ratio), outline=255, width=K * 2)
        out.paste(Image.new('RGBA', (W, W), (21, 19, 15, 46)), (0, 0), edge)
    return out.resize((S, S), Image.LANCZOS)

def svg(tone):
    top, bot, mark = TONES[tone]; S = 1024; inset = 100
    pts = squircle(240, S, inset); path = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z'
    R = S * .255; r2 = R * .74; off = r2 * .42; ox, oy = off * math.cos(math.radians(-38)), off * math.sin(math.radians(-38))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- Lumen 4.5: an aperture with a crescent of light, monochrome on a squircle (build/make-icon.py) -->
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient>
  <mask id="cres"><circle cx="512" cy="512" r="{r2:.1f}" fill="#fff"/><circle cx="{512 + ox:.1f}" cy="{512 + oy:.1f}" r="{r2:.1f}" fill="#000"/></mask></defs>
  <path d="{path}" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="{R - S * .009:.1f}" fill="none" stroke="{mark}" stroke-width="{S * .018:.1f}"/>
  <circle cx="512" cy="512" r="{r2:.1f}" fill="{mark}" mask="url(#cres)"/>
</svg>
'''

if __name__ == '__main__':
    big = {t: render(t) for t in TONES}
    big['default'].save(os.path.join(ROOT, 'build', 'icon.png'))
    open(os.path.join(ROOT, 'build', 'icon.svg'), 'w').write(svg('default'))
    for t, im in big.items():
        im.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'build', 'icons', t + '.png'))
        im.resize((96, 96), Image.LANCZOS).save(os.path.join(ROOT, 'pages', 'icon-' + t + '.png'))
    for f in ('installerIcon.ico', 'uninstallerIcon.ico'):
        big['default'].save(os.path.join(ROOT, 'build', 'nsis', f), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    if len(sys.argv) > 1:
        P = Image.new('RGB', (1024 + 40 + 8 * 140, 1064), '#e9e5dc'); P.paste(big['default'], (20, 20), big['default'])
        for i, t in enumerate(TONES):
            s = big[t].resize((128, 128), Image.LANCZOS); P.paste(s, (1064 + i * 140, 40), s)
            s = big[t].resize((32, 32), Image.LANCZOS); P.paste(s, (1064 + i * 140 + 48, 200), s)
            s = big[t].resize((16, 16), Image.LANCZOS); P.paste(s, (1064 + i * 140 + 56, 250), s)
        dark = Image.new('RGB', (8 * 140, 300), '#1a1a1a'); P.paste(dark, (1064, 300))
        for i, t in enumerate(TONES):
            s = big[t].resize((128, 128), Image.LANCZOS); P.paste(s, (1064 + i * 140, 320), s)
            s = big[t].resize((32, 32), Image.LANCZOS); P.paste(s, (1064 + i * 140 + 48, 480), s)
        P.save(sys.argv[1])
