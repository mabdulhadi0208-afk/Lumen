#!/usr/bin/env python3
"""Draws the Nova app icons for Surge and Koi (tools/glow/app-surge.png, app-koi.png, 256px) that tools/import-apps.py
copies to pages/ for the Surge and Koi page in Lumen Settings. Same art as the toolbar logos (ui/icons.js appLogo):
a Nova squircle in Lumen's blue turning to purple, a glass bevel, a caustic glow at the bottom, a specular band on top,
a hairline rim of light, and a white glyph with a soft shadow (Surge: the bolt, Koi: the fan ring).
Drawn 4x oversize and scaled down, so the edges stay crisp. Run it once after changing the design."""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = os.path.dirname(os.path.abspath(__file__))
S = 256; K = 4; N = S * K

def squircle(size, inset, n=4.4):
    m = Image.new('L', (size, size), 0); px = m.load(); c = size / 2; r = c - inset
    for y in range(size):
        dy = abs((y + .5 - c) / r)
        if dy >= 1: continue
        w = r * (1 - dy ** n) ** (1 / n)
        x0, x1 = int(math.floor(c - w)), int(math.ceil(c + w))
        for x in range(max(0, x0), min(size, x1)): px[x, y] = 255
    return m

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))

def icon(kind):
    A, B = ((84, 128, 255), (146, 72, 232)) if kind == "surge" else ((84, 128, 255), (112, 84, 240))
    C = (255, 120, 190) if kind == 'surge' else (90, 214, 255)
    inset = 14 * K
    mask = squircle(N, inset)
    # body: diagonal gradient with a third tint in the far corner
    body = Image.new('RGB', (N, N)); bp = body.load()
    for y in range(0, N, 2):
        for x in range(0, N, 2):
            t = (x + y) / (2 * N); col = lerp(A, B, min(1, t * 1.15))
            far = max(0, (x / N + y / N) - 1.25) / .75; col = lerp(col, C, min(.55, far))
            bp[x, y] = col; bp[x + 1, y] = col; bp[x, y + 1] = col; bp[x + 1, y + 1] = col
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    # outer accent glow and a soft drop shadow
    glow = Image.new('RGBA', (N, N), A + (0,)); glow.putalpha(mask.point(lambda v: v * 120 // 255).filter(ImageFilter.GaussianBlur(10 * K)))
    shadow = Image.new('RGBA', (N, N), (10, 12, 40, 0)); sm = Image.new('L', (N, N), 0); sm.paste(mask, (0, 6 * K)); shadow.putalpha(sm.point(lambda v: v * 90 // 255).filter(ImageFilter.GaussianBlur(7 * K)))
    im = Image.alpha_composite(im, glow); im = Image.alpha_composite(im, shadow)
    face = body.convert('RGBA'); face.putalpha(mask)
    # caustic: light pooled at the bottom
    ca = Image.new('L', (N, N), 0); d = ImageDraw.Draw(ca); d.ellipse((N * .12, N * .62, N * .88, N * 1.22), fill=110); ca = ca.filter(ImageFilter.GaussianBlur(26 * K))
    face = Image.alpha_composite(face, Image.merge('RGBA', (*Image.new('RGB', (N, N), (255, 255, 255)).split(), ImageChops.multiply(ca, mask))))
    # specular band across the top
    sp = Image.new('L', (N, N), 0); d = ImageDraw.Draw(sp); d.ellipse((-N * .3, -N * .78, N * 1.3, N * .34), fill=34); sp = sp.filter(ImageFilter.GaussianBlur(3 * K))
    face = Image.alpha_composite(face, Image.merge('RGBA', (*Image.new('RGB', (N, N), (255, 255, 255)).split(), ImageChops.multiply(sp, mask))))
    im = Image.alpha_composite(im, face)
    # hairline rim of light, brighter at the top-left
    inner = squircle(N, inset + 2.2 * K); rim = ImageChops.subtract(mask, inner)
    grad = Image.new('L', (N, N)); gp = grad.load()
    for y in range(0, N, 4):
        for x in range(0, N, 4):
            v = int(255 * max(.25, 1 - (x + y) / (1.6 * N)))
            for j in range(4):
                for i in range(4): gp[x + i, y + j] = v
    im = Image.alpha_composite(im, Image.merge('RGBA', (*Image.new('RGB', (N, N), (255, 255, 255)).split(), ImageChops.multiply(rim, grad))))
    # glyph (on the 48 grid of ui/icons.js appLogo)
    g = Image.new('L', (N, N), 0); d = ImageDraw.Draw(g); u = N / 48
    if kind == 'surge':
        pts = [(26.9, 8.8), (13.6, 27.5), (23.0, 27.5), (20.7, 39.2), (34.5, 20.0), (24.9, 20.0)]
        d.polygon([(x * u, y * u) for x, y in pts], fill=255); g = g.filter(ImageFilter.GaussianBlur(.5 * K)).point(lambda v: 255 if v > 110 else 0)
    else:
        c = 24 * u; r = 11.2 * u; w = 4.2 * u
        d.ellipse((c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2), fill=255); d.ellipse((c - r + w / 2, c - r + w / 2, c + r - w / 2, c + r - w / 2), fill=0)
        r2 = 4.6 * u; d.ellipse((c - r2, c - r2, c + r2, c + r2), fill=255)
        x, y, r3 = 31.9 * u, 16.1 * u, 2.6 * u; d.ellipse((x - r3, y - r3, x + r3, y + r3), fill=255)
    gs = Image.new('L', (N, N), 0); gs.paste(g, (0, int(1.6 * K * 2))); gs = gs.filter(ImageFilter.GaussianBlur(3 * K)).point(lambda v: v * 80 // 255)
    im = Image.alpha_composite(im, Image.merge('RGBA', (*Image.new('RGB', (N, N), (8, 10, 40)).split(), gs)))
    im = Image.alpha_composite(im, Image.merge('RGBA', (*Image.new('RGB', (N, N), (255, 255, 255)).split(), g)))
    return im.resize((S, S), Image.LANCZOS)

for k in ('surge', 'koi'):
    icon(k).save(os.path.join(OUT, f'app-{k}.png'), optimize=True)
print('drew app-surge.png and app-koi.png')
