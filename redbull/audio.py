"""Drum & bass soundtrack for the Red Bull spec concept, synthesised from scratch
and locked to the visual grid: 160 BPM, 40 beats == 10 bars == exactly 15 s.

    python3 audio.py  ->  build/soundtrack.wav  (48 kHz, 16-bit stereo)
"""
import os
import wave
import numpy as np
from scipy import signal

SR = 48000
DUR = 15.0
N = int(SR * DUR)
BPM = 160
B = 60 / BPM          # 0.375 s
BAR = 4 * B           # 1.5 s
S16 = B / 4
rng = np.random.default_rng(160)

BUS = {k: np.zeros((2, N)) for k in ('kick', 'drums', 'bass', 'pad', 'arp', 'fx', 'verb', 'delay')}


def add(bus, t0, sig, pan=0.0, gain=1.0):
    sig = np.asarray(sig, dtype=float)
    if sig.ndim == 1 and bus == 'pad':
        k = int(0.011 * SR)
        sig = np.vstack([sig, np.concatenate([np.zeros(k), sig[:-k]])])
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    i0 = int(round(t0 * SR))
    if i0 < 0:
        sig = sig[:, -i0:]
        i0 = 0
    n = min(sig.shape[1], N - i0)
    if n > 0:
        BUS[bus][:, i0:i0 + n] += sig[:, :n] * gain


# ---------------------------------------------------------------- primitives
def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def filt(x, kind, f, order=2):
    sos = signal.butter(order, f, kind, fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def rbj(kind, fc, q):
    w0 = 2 * np.pi * fc / SR
    al, cw = np.sin(w0) / (2 * q), np.cos(w0)
    if kind == 'lp':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
    elif kind == 'hp':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
    else:
        b = [al, 0, -al]
    a = [1 + al, -2 * cw, 1 - al]
    return np.array(b) / a[0], np.array(a) / a[0]


def sweep(x, fc, kind='lp', q=0.8, block=128):
    """Time-varying biquad; fc is a function of seconds."""
    out = np.zeros_like(x)
    zi = np.zeros(2)
    for i in range(0, len(x), block):
        f = float(np.clip(fc((i + block / 2) / SR), 25, SR * 0.45))
        b, a = rbj(kind, f, q)
        out[i:i + block], zi = signal.lfilter(b, a, x[i:i + block], zi=zi)
    return out


def saw(f, d, cents=0.0, phase=0.0):
    t = tt(d)
    return 2 * ((t * f * 2 ** (cents / 1200) + phase) % 1) - 1


def supersaw(f, d, voices=7, spread=18):
    return sum(saw(f, d, c, rng.random()) for c in np.linspace(-spread, spread, voices)) / np.sqrt(voices)


def sine_glide(f0, f1, d, curve=1.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** ((t / d) ** curve)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def osc_f(f):
    """Sine for an arbitrary frequency array."""
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def mtof(n):
    return 440 * 2 ** ((n - 69) / 12)


def adsr(d, a=0.005, rel=0.05):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    r = int(rel * SR)
    if r and r < len(e):
        e[-r:] *= np.linspace(1, 0, r)
    return e


def mx(*sigs):
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[:len(x)] += x
    return out


# ---------------------------------------------------------------- instruments
def kick(d=0.4, f0=170, f1=48, pdec=36, adec=8, drive=2.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * pdec)
    s = osc_f(f) * np.exp(-t * adec) * np.minimum(1, t / 0.0012)
    s += filt(noise(d), 'highpass', 3000) * np.exp(-t * 380) * 0.4
    return np.tanh(s * drive) / np.tanh(drive)


def snare(d=0.3, tone=200, bright=1.0):
    t = tt(d)
    n = filt(noise(d), 'bandpass', [1200, 9000]) * np.exp(-t * 15) * 0.9 * bright
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 24) * 0.7
    return np.tanh((n + body) * 1.6) * 0.8


def hat(d=0.05, dec=90):
    t = tt(d)
    return filt(noise(d), 'highpass', 8000, 4) * np.exp(-t * dec)


def crash(d=2.2):
    t = tt(d)
    n = filt(noise(d), 'highpass', 3500)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (587, 845, 1233, 1559, 2097)) / 5
    return (n + filt(metal, 'highpass', 3000) * 0.4) * np.exp(-t * 2.2) * np.minimum(1, t / 0.002)


def boom(d=2.0):
    t = tt(d)
    sub = sine_glide(95, 28, d, 0.35) * np.exp(-t * 1.8)
    body = kick(d, 230, 40, 18, 3.0, 2.5) * 0.8
    burst = filt(noise(d), 'lowpass', 3000) * np.exp(-t * 10) * 0.5
    return np.tanh((sub + body + burst) * 1.4) * 0.9


def tick(f=2600, d=0.03):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)


def tok(f=520, d=0.16):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 40)) * np.exp(-t * 26)


def bloop(f0, f1, d=0.14):
    t = tt(d)
    return sine_glide(f0, f1, d, 0.6) * np.exp(-t * 18) * np.minimum(1, t / 0.003)


def beep(f=940, d=0.12):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * 0.7 + np.sign(np.sin(2 * np.pi * f * t)) * 0.15
    return s * adsr(d, 0.003, 0.02)


def fm_bell(f, d=2.0, ratio=3.5, idx=2.5, dec=2.2):
    t = tt(d)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t * dec * 2)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * dec) * np.minimum(1, t / 0.002)


def whoosh(d, f0, f1, q=1.2, shape=1.0):
    t = tt(d)
    y = sweep(noise(d), lambda s: f0 * (f1 / f0) ** min(1, (s / d) ** shape), 'bp', q)
    return y * np.sin(np.pi * np.minimum(1, t / d)) ** 1.5 * 3


def riser(d, f0=200, f1=8000):
    t = tt(d)
    n = sweep(noise(d), lambda s: f0 * (f1 / f0) ** (s / d), 'bp', 1.5) * 3
    tone = sine_glide(110, 880, d, 1.6) * 0.25 + sine_glide(165, 1320, d, 1.6) * 0.12
    return (n + tone) * (t / d) ** 2.2


def zap(f0=3200, f1=90, d=0.1):
    t = tt(d)
    s = np.sign(sine_glide(f0, f1, d, 0.4)) * 0.5 + sine_glide(f0 * 0.5, f1, d, 0.4)
    return np.round(s * 6) / 6 * np.exp(-t * 22) * 0.6


def engine(d, fr, bright=8.0, grit=0.15):
    """Combustion engine: firing-frequency saw + half-order pulse + AM, cutoff tracks rpm."""
    t = tt(d)
    f = fr(t)
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) * 0.6 + np.sign(np.sin(2 * np.pi * ph * 0.5)) * 0.3 + np.sin(4 * np.pi * ph) * 0.2
    s *= 1 + 0.35 * np.sin(np.pi * ph)
    s += filt(noise(d), 'bandpass', [900, 3500]) * grit
    s = sweep(s, lambda u: 300 + bright * float(fr(np.array([u]))[0]), 'lp', 1.2)
    return np.tanh(s * 1.8)


def wind(d, f0=400, f1=900, rate=0.7):
    t = tt(d)
    y = sweep(noise(d), lambda s: f0 + (f1 - f0) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * s)), 'bp', 0.7)
    return y * (0.7 + 0.3 * np.sin(2 * np.pi * 1.3 * t + 1))


def reese(n, d):
    f = mtof(n)
    x = saw(f, d, -22) + saw(f, d, 22) + 0.5 * saw(f / 2, d, 7)
    y = sweep(x, lambda s: 380 + 520 * (0.5 + 0.5 * np.sin(2 * np.pi * s / (2 * B))), 'lp', 2.2)
    return np.tanh(y * 1.4) * adsr(d, 0.01, 0.04)


def stab(notes, d=0.32, cut=3200):
    x = sum(supersaw(mtof(n), d, 5, 14) for n in notes)
    return filt(x, 'lowpass', cut) * np.exp(-tt(d) * 6) * adsr(d, 0.003, 0.03)


def pluck(n, d=0.2, bright=4200):
    f, t = mtof(n), tt(d)
    x = saw(f, d) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.003 * t)) * 0.4
    return sweep(x, lambda s: 300 + bright * np.exp(-s * 24), 'lp', 1.4, 64) * np.exp(-t * 12) * np.minimum(1, t / 0.002)


# ---------------------------------------------------------------- arrangement
def bar(k, beat=0.0):
    return k * BAR + beat * B


CH = {'Fm': [53, 56, 60, 65], 'Db': [53, 56, 61, 65], 'Ab': [51, 56, 60, 63], 'Eb': [51, 55, 58, 63], 'C': [52, 55, 60, 64]}
ROOT = {'Fm': 29, 'Db': 25, 'Ab': 32, 'Eb': 27, 'C': 24}
PROG = [None, 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb', 'Fm']
kick_times = []


def k_(t, g=1.0, **kw):
    add('kick', t, kick(**kw), 0, g)
    kick_times.append(t)


def dnb(b, from_step=0, to_step=16, g=1.0, muffle=False):
    """Two-step DnB pattern on bar b: kick 0 & 10, snare 4 & 12, ghosts, rolling hats."""
    for s in range(from_step, to_step):
        t = bar(b) + s * S16
        if s in (0, 10):
            k_(t, g)
        if s in (4, 12):
            sn = snare()
            add('drums', t, filt(sn, 'lowpass', 1500) if muffle else sn, 0, 0.75 * g)
            add('verb', t, sn, 0, 0.18 * g)
        if s in (7, 15) and not muffle:
            add('drums', t, snare(0.12, 230, 0.6), 0.1, 0.18 * g)
        h = hat(0.05 if s % 2 else 0.03, 70 if s % 2 else 110)
        if muffle:
            h = filt(h, 'lowpass', 2500)
        add('drums', t, h, 0.3 if s % 2 else -0.2, (0.28 if s % 4 == 2 else 0.16) * g)


# Bar 0 — Départ: grid, five beeps, engine revving, riser, then silence before the drop
add('fx', 0.0, kick(0.5, 90, 40, 20, 6) * 0.6 + filt(noise(0.5), 'lowpass', 400) * np.exp(-tt(0.5) * 6) * 0.3, 0, 0.6)
for k in range(12):
    add('drums', k * 0.04, tick(3000 + 150 * k, 0.012), (k - 6) / 8, 0.07)
add('fx', 0.1, whoosh(0.35, 500, 3000, 2.0), -0.4, 0.3)
LIGHTS = [S16 * 2 * (k + 1) for k in range(5)]
for i, t0 in enumerate(LIGHTS):
    add('fx', t0, beep(940, 0.11), 0, 0.28 + 0.06 * i)
OUT = 3.5 * B
rev = lambda t: 95 + sum(110 * np.exp(-np.maximum(0, t - (L - 0.02)) * 7) * (t >= L - 0.02) for L in LIGHTS) + 40 * (t / OUT)
add('fx', 0.05, engine(OUT - 0.05, lambda t: rev(t + 0.05), 6.0) * adsr(OUT - 0.05, 0.08, 0.004), 0, 0.22)
add('fx', 0.45, riser(OUT - 0.45, 300, 7000)[:int((OUT - 0.45) * SR)], 0, 0.35)
add('fx', OUT, mx(tick(1200, 0.03), tok(140, 0.12) * 0.6), 0, 0.5)              # lights out relay
add('fx', OUT + 0.01, bloop(300, 900, 0.12), 0, 0.3)                              # the sun pops
r = crash(BAR - OUT)[::-1] * np.linspace(0, 1, int((BAR - OUT) * SR)) ** 3
add('fx', OUT, r, 0, 0.4)

# Bars 1–9 groove skeleton
for b in (1, 2, 3, 5):
    dnb(b)
dnb(4, 0, 2)                    # FMX: drums drop out while the bike is in the air
dnb(4, 8, 16)                   # ...and slam back on the landing
dnb(6, 0, 7, 0.8)               # can: hold your breath for the hiss
dnb(6, 10, 16, 0.9)
dnb(7, 0, 16, 0.9, muffle=True)  # underwater
dnb(8, 0, 8)

# bass + harmony
for b in range(1, 10):
    name = PROG[b]
    if b == 8:
        for h, nm in enumerate(('Eb', 'C')):
            d = 2 * B
            add('bass', bar(b, 2 * h), reese(ROOT[nm] + 12, d), 0, 0.5)
            add('bass', bar(b, 2 * h), np.sin(2 * np.pi * mtof(ROOT[nm] + 12) * tt(d)) * adsr(d, 0.01, 0.03), 0, 0.5)
            pad = sum(supersaw(mtof(n), d + 0.05) for n in CH[nm])
            add('pad', bar(b, 2 * h), sweep(pad, lambda s, h=h: 1200 + 3000 * ((h * d + s) / BAR) ** 2, 'lp', 1.0) * adsr(d + 0.05, 0.01, 0.05), 0, 0.22)
        continue
    if b == 9:
        continue
    d = BAR
    rs = reese(ROOT[name] + 12, d)
    if b == 7:
        rs = filt(rs, 'lowpass', 500)
    if b == 4:
        rs = rs * np.concatenate([np.ones(int(0.12 * SR)), np.full(int(0.63 * SR), 0.15), np.ones(len(rs) - int(0.75 * SR))])
    add('bass', bar(b), rs, 0, 0.5)
    add('bass', bar(b), np.sin(2 * np.pi * mtof(ROOT[name] + 12) * tt(d)) * adsr(d, 0.01, 0.03), 0, 0.5)
    pad = sum(supersaw(mtof(n), d + 0.1) for n in CH[name])
    cut = 900 if b == 7 else 2400
    add('pad', bar(b), filt(pad, 'lowpass', cut) * adsr(d + 0.1, 0.02, 0.1), 0, 0.2 if b != 7 else 0.3)

# Bar 1 — Énergie: impact + a chord stab on every word
add('fx', BAR, boom(1.4), 0, 0.6)
add('fx', BAR, crash(), 0, 0.35)
add('verb', BAR, crash(), 0, 0.2)
for q in range(4):
    add('pad', bar(1, q), stab(CH['Fm'], 0.3), 0, 0.3)
    add('verb', bar(1, q), stab(CH['Fm'], 0.3), 0, 0.1)
add('fx', bar(1, 1), zap(2600, 300, 0.16), 0.5, 0.3)
add('fx', bar(1, 1), whoosh(0.3, 3000, 800, 1.6), -0.5, 0.25)
for i in range(8):
    add('fx', bar(1, 2) + 0.1 + i * 0.028, tok(260 + 40 * i, 0.1), -0.6 + 0.17 * i, 0.3)
add('fx', bar(1, 3) + 0.15, whoosh(0.3, 6000, 500, 1.2, 0.7), 0.6, 0.45)     # letters whip off
add('fx', bar(1, 3) + 0.12, riser(0.25, 800, 9000), 0, 0.3)

# Bar 2 — F1: gear shifts on the beat, white-out at the end
def f1_rev(t):
    k = np.floor(t / B)
    r = (t - k * B) / B
    return 230 + 210 * (1 - (1 - r) ** 2) + 12 * k
add('fx', bar(2), engine(BAR, f1_rev, 9.0, 0.22) * adsr(BAR, 0.01, 0.1), 0, 0.33)
for k in (1, 2, 3):
    add('fx', bar(2, k), mx(tok(180, 0.08) * 0.8, tick(2400, 0.02)), 0.2, 0.4)        # shift clunk
for i in range(6):
    add('fx', bar(2) + i * B * 0.66, whoosh(0.22, 900, 4000, 2.0), (-1) ** i * 0.7, 0.18)
add('fx', bar(2, 3) - 0.1, riser(0.6, 600, 12000), 0, 0.45)
ARP = [65, 68, 72, 77, 80, 77, 72, 68]
for s in range(16):
    p = pluck(ARP[s % 8], 0.18, 3200 + 1500 * (s % 4 == 0))
    add('arp', bar(2) + s * S16, p, -0.4 if s % 2 else 0.4, 0.22)
    add('delay', bar(2) + s * S16, p, 0, 0.1)

# Bar 3 — Wingsuit: wind, the flyer's entry, falling letters, whip-pan
add('fx', bar(3), wind(BAR, 350, 1200, 0.9) * adsr(BAR, 0.05, 0.1), 0, 0.4)
add('fx', bar(3), whoosh(0.5, 5000, 400, 1.0, 0.6), -0.4, 0.5)
add('fx', bar(3), boom(0.9), 0, 0.3)
for i in range(11):
    add('fx', bar(3, 1) + i * 0.022 + 0.12, tok(500 - 18 * i, 0.08), -0.7 + 0.12 * i, 0.15)
add('fx', bar(3) + 1.25, whoosh(0.3, 300, 6000, 1.2, 0.6), 0, 0.5)

# Bar 4 — FMX: two-stroke braap, silence in the air, landing impact
def braap(t):
    return np.where(t < 0.12, 110 + 700 * t, np.where(t < 0.75, 200 + 40 * np.exp(-(t - 0.12) * 3), 150 + 260 * np.minimum(1, (t - 0.75) * 3)))
eng = engine(1.2, braap, 7.0, 0.3)
env = np.ones(len(eng))
i1, i2 = int(0.12 * SR), int(0.75 * SR)
env[i1:i2] = np.linspace(1, 0.25, i2 - i1)
add('fx', bar(4), eng * env * adsr(1.2, 0.02, 0.2), 0.2, 0.3)
add('fx', bar(4) + 0.12, wind(0.63, 800, 2000, 2) * np.hanning(int(0.63 * SR)), 0, 0.35)
add('fx', bar(4, 2), boom(1.0), 0, 0.6)
add('fx', bar(4, 2), crash(1.4), 0, 0.3)
add('fx', bar(4, 2), whoosh(0.4, 4000, 300, 0.9, 0.6), 0, 0.3)            # pull back to the grid
for d in range(9):
    add('fx', bar(4, 3) + d * 0.03, tick(1800 + 170 * d, 0.02), (d - 4) / 5, 0.2)

# Bar 5 — Snow: carving sprays, glide, temperature ticks, snow burst
add('fx', bar(5), wind(BAR, 900, 2600, 0.5) * adsr(BAR, 0.1, 0.1), 0, 0.15)
for j, u in enumerate((1 / 6, 1 / 2, 5 / 6)):
    t0 = bar(5) + u * 1.42
    add('fx', t0 - 0.08, whoosh(0.35, 2000, 6000, 1.0, 0.5), 0.5 if j % 2 == 0 else -0.5, 0.45)
add('fx', bar(5, 0.5), whoosh(0.4, 400, 2500, 1.6), -0.6, 0.3)
for k in range(10):
    add('fx', bar(5) + 0.2 + k * 0.075, tick(5200 - 200 * k, 0.012), 0.6, 0.07)
add('fx', bar(5) + 1.15, riser(0.35, 1500, 14000), 0, 0.45)
add('fx', bar(5) + 1.15, whoosh(0.35, 800, 9000, 1.0, 0.5), 0, 0.35)

# Bar 6 — Fraîcheur: shimmer, ice clinks, then the can cracks open: click, pop, hiss, fizz
for n, o in ((88, 0.0), (93, 0.04), (96, 0.09)):
    add('fx', bar(6) + o, fm_bell(mtof(n), 1.4, 3.0, 1.8, 2.6), (n - 92) / 6, 0.09)
    add('verb', bar(6) + o, fm_bell(mtof(n), 1.4, 3.0, 1.8, 2.6), 0, 0.08)
for k, a in enumerate((0.3, 0.48, 0.66)):
    add('fx', bar(6) + a, tick(2100, 0.02), (-1) ** k * 0.6, 0.25)
crack = bar(6, 2)
add('fx', crack - 0.04, mx(tick(3500, 0.012), tick(1800, 0.02)), 0, 0.6)                       # tab lift
t = tt(0.05)
add('fx', crack, filt(noise(0.05), 'bandpass', [1500, 6000]) * np.exp(-t * 90) * 1.4, 0, 0.8)   # pop
th = tt(0.9)
hiss = filt(noise(0.9), 'bandpass', [3000, 11000]) * np.exp(-th * 4.5) * np.minimum(1, th / 0.01)
add('fx', crack + 0.01, hiss, 0, 0.75)
add('verb', crack + 0.01, hiss, 0, 0.2)
for k in range(140):                                                                           # fizz
    tf = crack + 0.05 + rng.random() ** 1.6 * 1.1
    add('fx', tf, tick(rng.uniform(4000, 9000), 0.006), rng.uniform(-0.8, 0.8), 0.05 * rng.random())
add('fx', bar(6) + 1.05, whoosh(0.45, 4000, 150, 0.9, 0.7), 0, 0.5)                             # dive into the label

# Bar 7 — Surf / cliff: splash, bubbles, underwater muffle, glitch stutters
tsp = tt(0.9)
splash = filt(noise(0.9), 'lowpass', 5000) * np.exp(-tsp * 5) * np.minimum(1, tsp / 0.003)
add('fx', bar(7), splash, 0.3, 0.9)
add('fx', bar(7), boom(0.8), 0, 0.4)
add('verb', bar(7), splash, 0, 0.3)
for i in range(7):
    add('fx', bar(7, 0.5) + i * 0.045, bloop(200 + 40 * i, 800 + 100 * i, 0.16), -0.6 + 0.2 * i, 0.3)
for k in range(24):
    add('fx', bar(7) + 0.1 + rng.random() * 1.1, bloop(300 + rng.random() * 500, 1300 + rng.random() * 900, 0.07), rng.uniform(-0.8, 0.8), 0.12)
for k in range(8):
    add('fx', bar(7) + 1.25 + k * (0.25 / 8), zap(rng.uniform(1500, 6000), rng.uniform(80, 400), 0.035), rng.uniform(-0.7, 0.7), 0.3)

# Bar 8 — Télémétrie: data ticks, sticker slap, 16th-note montage with a tightening roll
b8 = bar(8)
add('fx', b8, zap(6000, 200, 0.1), 0, 0.4)
for k in range(6):
    add('fx', b8 + k * 0.035, tick(2500 + 300 * k, 0.015), (k - 2.5) / 3, 0.18)
for k in range(20):
    add('fx', b8 + 0.05 + k * 0.03, tick(5000 + 400 * (k % 3), 0.008), (k % 5 - 2) / 3, 0.05)
add('fx', b8 + B, mx(snare(0.3, 160) * 1.1, tok(150, 0.2)), 0, 0.5)
for s in range(8):
    t0 = b8 + 2 * B + s * S16
    k_(t0, 0.7 if s % 2 else 0.9)
    add('fx', t0, zap(rng.uniform(2500, 7000), rng.uniform(60, 300), 0.08), rng.uniform(-0.6, 0.6), 0.35)
    add('drums', t0, snare(0.15, 210 + s * 20), 0, 0.3 + 0.05 * s)
    add('drums', t0 + S16 / 2, snare(0.1, 220 + s * 20), 0, 0.2 + 0.04 * s)
add('fx', b8 + 2 * B, riser(2 * B, 500, 14000), 0, 0.55)

# Bar 9 — Donne des ailes: impact, final chord, wings, chimes
b9 = bar(9)
k_(b9, 1.0)
add('fx', b9, boom(1.5), 0, 0.85)
add('fx', b9, crash(1.5), 0, 0.4)
add('verb', b9, crash(1.5), 0, 0.3)
fin = sum(supersaw(mtof(n), 1.5) for n in CH['Fm'] + [67, 72])
add('pad', b9, filt(fin, 'lowpass', 3500) * np.exp(-tt(1.5) * 1.5), 0, 0.3)
add('verb', b9, filt(fin, 'lowpass', 3500) * np.exp(-tt(1.5) * 1.5), 0, 0.12)
add('bass', b9, np.sin(2 * np.pi * mtof(41) * tt(1.45)) * np.exp(-tt(1.45) * 1.8), 0, 0.5)
add('fx', b9 + 0.16, bloop(250, 800, 0.14), 0, 0.35)                                       # sun
for k, o in enumerate((0.0, 0.07)):
    add('fx', bar(9, 1) + o, filt(whoosh(0.4, 250, 1600, 0.9, 0.7), 'lowpass', 2500), (-1) ** k * 0.6, 0.55)  # wings open
add('fx', bar(9, 3), filt(whoosh(0.3, 300, 1200, 0.9), 'lowpass', 2000), 0, 0.4)           # flap
for n, o in ((77, 0.0), (84, 0.04), (89, 0.08)):
    add('fx', bar(9, 1.5) + o, fm_bell(mtof(n), 1.3, 3.5, 2.0, 2.4), (n - 84) / 10, 0.14)
    add('verb', bar(9, 1.5) + o, fm_bell(mtof(n), 1.3, 3.5, 2.0, 2.4), 0, 0.1)
add('fx', bar(9, 2), tick(3000, 0.02), 0, 0.25)
for k in range(14):
    add('fx', b9 + 0.85 + k * 0.025, tick(4800 + 200 * (k % 4), 0.01), 0, 0.05)


# ---------------------------------------------------------------- mix
def sidechain():
    env = np.ones(N)
    t = np.arange(N) / SR
    for k in sorted(kick_times):
        i0 = int(k * SR)
        env[i0:] = np.minimum(env[i0:], 1 - 0.65 * np.exp(-(t[i0:] - k) * 11))
    return env


def reverb(x, d=1.8):
    t = tt(d)
    ir = np.vstack([rng.standard_normal(len(t)), rng.standard_normal(len(t))]) * np.exp(-t * 3.6)
    ir = np.vstack([filt(ir[0], 'lowpass', 6500), filt(ir[1], 'lowpass', 6500)]) * 0.02
    return np.vstack([signal.fftconvolve(x[0], ir[0])[:N], signal.fftconvolve(x[1], ir[1])[:N]])


def delay(x, dt=B * 0.75, fb=0.35):
    y = np.zeros_like(x)
    n = int(dt * SR)
    tap, g, side = filt(x[0] + x[1], 'bandpass', [400, 5000]) * 0.5, 1.0, 0
    for _ in range(5):
        g *= fb
        tap = np.concatenate([np.zeros(n), tap[:-n]])
        y[side] += tap * g / fb
        side ^= 1
    return y


sc = sidechain()
mix = (BUS['kick'] + BUS['drums'] * 0.9 + BUS['bass'] * sc * 0.85 + BUS['pad'] * sc * 0.8
       + BUS['arp'] * sc * 0.8 + BUS['fx'] * 0.9 + delay(BUS['delay']) * 0.6
       + reverb(BUS['verb'] + BUS['pad'] * 0.12 + BUS['fx'] * 0.1))
mix = np.vstack([filt(mix[0], 'highpass', 28), filt(mix[1], 'highpass', 28)])

# silence before the drop: hard-duck everything between lights out and the downbeat except the reverse swell
tm = np.arange(N) / SR
gap = (tm > OUT + 0.06) & (tm < BAR)
mix[:, gap] *= 0.35

mix /= np.abs(mix).max()
lvl = np.maximum(np.abs(mix[0]), np.abs(mix[1]))
a = np.exp(-1 / (0.05 * SR))
envl = signal.lfilter([1 - a], [1, -a], lvl)
thr = 10 ** (-14 / 20)
mix *= np.where(envl > thr, (thr / np.maximum(envl, 1e-9)) ** (1 - 1 / 3), 1.0)
mix = np.tanh(mix * 2.2) / np.tanh(2.2)
mix *= 0.89 / np.abs(mix).max()
fade = int(0.2 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2

os.makedirs('build', exist_ok=True)
pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').T.copy()
with wave.open('build/soundtrack.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote build/soundtrack.wav', f'{len(pcm) / SR:.3f}s')
