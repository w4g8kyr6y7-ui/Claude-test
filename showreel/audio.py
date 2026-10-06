"""Soundtrack for the reel, synthesised from scratch and locked to the same
128 BPM grid as the visuals (32 beats == 15 s). Every hit below is placed on a
visual event: cuts, landings, flickers, mouse clicks, keyframes, the logo.

    python3 audio.py  ->  build/soundtrack.wav  (48 kHz, 16-bit stereo)
"""
import os
import wave
import numpy as np
from scipy import signal

SR = 48000
DUR = 15.0
N = int(SR * DUR)
BPM = 128
B = 60 / BPM          # beat
BAR = 4 * B
S16 = B / 4
rng = np.random.default_rng(26)

BUS = {k: np.zeros((2, N)) for k in ('kick', 'drums', 'bass', 'pad', 'arp', 'fx', 'verb', 'delay')}


def add(bus, t0, sig, pan=0.0, gain=1.0):
    sig = np.asarray(sig, dtype=float)
    if sig.ndim == 1 and bus == 'pad':  # Haas widening for the pads
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
    if kind == 'bandpass':
        sos = signal.butter(order, f, 'bandpass', fs=SR, output='sos')
    else:
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
    ff = f * 2 ** (cents / 1200)
    return 2 * ((t * ff + phase) % 1) - 1


def supersaw(f, d, voices=7, spread=16):
    return sum(saw(f, d, c, rng.random()) for c in np.linspace(-spread, spread, voices)) / np.sqrt(voices)


def sine_glide(f0, f1, d, curve=1.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** ((t / d) ** curve)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def mx(*sigs):
    """Sum signals of different lengths."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[:len(x)] += x
    return out


def mtof(n):
    return 440 * 2 ** ((n - 69) / 12)


def adsr(d, a=0.005, rel=0.05):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    r = int(rel * SR)
    if r and r < len(e):
        e[-r:] *= np.linspace(1, 0, r)
    return e


# ---------------------------------------------------------------- instruments
def kick(d=0.5, f0=160, f1=44, pdec=32, adec=6.5, drive=1.8):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * pdec)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * adec) * np.minimum(1, t / 0.0015)
    s += filt(noise(d), 'highpass', 2500) * np.exp(-t * 350) * 0.35
    return np.tanh(s * drive) / np.tanh(drive)


def boom(d=2.6):
    """Cinematic impact: sub drop + body + noise burst."""
    t = tt(d)
    sub = sine_glide(90, 28, d, 0.35) * np.exp(-t * 1.6)
    body = kick(d, 220, 40, 18, 3.0, 2.5) * 0.8
    burst = filt(noise(d), 'lowpass', 3000) * np.exp(-t * 9) * 0.5
    return np.tanh((sub + body + burst) * 1.4) * 0.9


def clap(d=0.4):
    t = tt(d)
    e = np.zeros_like(t)
    for k, o in enumerate((0, 0.011, 0.023)):
        m = t >= o
        e[m] += np.exp(-(t[m] - o) * (180 if k < 2 else 13))
    return filt(noise(d), 'bandpass', [900, 4200]) * e * 0.9


def snare(d=0.28, tone=190):
    t = tt(d)
    return filt(noise(d), 'bandpass', [1200, 8000]) * np.exp(-t * 17) * 0.8 + np.sin(2 * np.pi * tone * t) * np.exp(-t * 28) * 0.6


def hat(d=0.07, dec=75):
    t = tt(d)
    return filt(noise(d), 'highpass', 7500, 4) * np.exp(-t * dec)


def crash(d=2.4):
    t = tt(d)
    n = filt(noise(d), 'highpass', 3500, 2)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (587, 845, 1233, 1559, 2097)) / 5
    return (n + filt(metal, 'highpass', 3000) * 0.4) * np.exp(-t * 2.0) * np.minimum(1, t / 0.002)


def tick(f=2600, d=0.03):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)


def tok(f=520, d=0.18):
    """Woodblock / marimba-ish knock."""
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 40)) * np.exp(-t * 26)


def bloop(f0, f1, d=0.16):
    t = tt(d)
    return sine_glide(f0, f1, d, 0.6) * np.exp(-t * 18) * np.minimum(1, t / 0.003)


def fm_bell(f, d=2.5, ratio=3.5, idx=2.8, dec=2.2):
    t = tt(d)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t * dec * 2)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * dec) * np.minimum(1, t / 0.002)


def whoosh(d, f0, f1, q=1.2, shape=1.0):
    """Band-passed noise sweep with a swell envelope."""
    t = tt(d)
    x = noise(d)
    y = sweep(x, lambda s: f0 * (f1 / f0) ** min(1, (s / d) ** shape), 'bp', q)
    env = np.sin(np.pi * np.minimum(1, t / d)) ** 1.5
    return y * env * 3


def riser(d, f0=200, f1=6000):
    t = tt(d)
    env = (t / d) ** 2.2
    n = sweep(noise(d), lambda s: f0 * (f1 / f0) ** (s / d), 'bp', 1.5) * 3
    tone = sine_glide(110, 880, d, 1.6) * 0.25 + sine_glide(165, 1320, d, 1.6) * 0.12
    return (n + tone) * env


def zap(f0=3200, f1=90, d=0.12):
    t = tt(d)
    s = np.sign(sine_glide(f0, f1, d, 0.4)) * 0.5 + sine_glide(f0 * 0.5, f1, d, 0.4)
    crushed = np.round(s * 6) / 6
    return crushed * np.exp(-t * 22) * 0.6


def buzz(d, f=100):
    t = tt(d)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + filt(noise(d), 'bandpass', [2000, 6000]) * 0.5
    return filt(s, 'lowpass', 5000)


def pluck(n, d=0.24, bright=4200):
    f = mtof(n)
    t = tt(d)
    x = saw(f, d) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.003 * t)) * 0.4
    y = sweep(x, lambda s: 300 + bright * np.exp(-s * 22), 'lp', 1.4, 64)
    return y * np.exp(-t * 11) * np.minimum(1, t / 0.002)


# ---------------------------------------------------------------- arrangement
def bar(k, beat=0.0):
    return k * BAR + beat * B


CHORDS = [None, [57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], None, [57, 60, 64, 69, 76]]
ROOTS = [None, 33, 29, 36, 31, 33, None, 33]
kick_times = []


def place_kick(t, gain=1.0, **kw):
    add('kick', t, kick(**kw), 0, gain)
    kick_times.append(t)


# Bar 0 — Swiss intro: clock ticks, pops, rising pad
for k in range(8):
    add('drums', k * B / 2, tick(3200 if k % 2 == 0 else 2400), 0.3 if k % 2 else -0.3, 0.12 + 0.03 * k)
add('fx', 0.04, bloop(1400, 520, 0.22), 0.2, 0.55)                       # dot pop
add('fx', 0.06, fm_bell(1046.5, 1.2, 2.0, 1.2, 4), 0.2, 0.12)
add('fx', B - 0.04, whoosh(0.35, 400, 3000, 2.0), -0.3, 0.35)            # "Motion"
add('fx', 2 * B - 0.04, whoosh(0.35, 500, 3600, 2.0), 0.3, 0.35)         # "design"
arc = sine_glide(500, 1300, 0.29, 1) * np.exp(-tt(0.29) * 2)
add('fx', 0.52, np.concatenate([arc, sine_glide(1300, 420, 0.29, 1) * np.exp(-tt(0.29) * 5)]) * 0.18, 0.4)
add('fx', 1.10, tok(780), 0.35, 0.6)                                     # dot lands as the period
add('fx', 1.0, bloop(300, 900, 0.12), 0.6, 0.35)                          # badge
for k in range(14):                                                       # scramble chatter
    add('fx', 0.25 + k * 0.045, tick(4200 + 300 * (k % 4), 0.015), (k % 3 - 1) * 0.6, 0.08)
pad0 = sum(supersaw(mtof(n), BAR, 5, 10) for n in CHORDS[1])
pad0 = sweep(pad0, lambda s: 250 * (3500 / 250) ** (s / BAR), 'lp', 0.9) * np.linspace(0, 1, len(pad0)) ** 1.5
add('pad', 0, pad0, 0, 0.5)
add('fx', 3 * B, riser(B + 0.02), 0, 0.5)                                 # dot swallows the frame
rev = crash(0.5)[::-1] * np.linspace(0, 1, int(0.5 * SR)) ** 2
add('fx', BAR - 0.5, rev, 0, 0.5)

# Bars 1–4 — the main groove
for b in range(1, 5):
    for q in range(4):
        place_kick(bar(b, q))
        add('drums', bar(b, q + 0.5), hat(), 0.25, 0.32)
        if q % 2 == 1:
            add('drums', bar(b, q), clap(), 0, 0.55)
            add('verb', bar(b, q), clap(), 0, 0.25)
    if b >= 3:
        for s in range(16):
            if s % 2:
                add('drums', bar(b) + s * S16, hat(0.05, 95), -0.35, 0.16 + 0.06 * (s % 4 == 3))
    if b == 4:
        for q in range(4):
            add('drums', bar(b, q + 0.5), hat(0.32, 11), 0.2, 0.12)
    for q in range(4):  # off-beat bass
        n = ROOTS[b] + 12
        d = B / 2 * 0.92
        x = saw(mtof(n), d) + saw(mtof(n), d, 9) * 0.6
        x = sweep(x, lambda s: 180 + 1400 * np.exp(-s * 18), 'lp', 1.1, 64) * adsr(d, 0.003, 0.02)
        add('bass', bar(b, q + 0.5), x, 0, 0.55)
    sub = np.sin(2 * np.pi * mtof(ROOTS[b]) * tt(BAR)) * adsr(BAR, 0.01, 0.05)
    add('bass', bar(b), sub, 0, 0.45)
    pad = sum(supersaw(mtof(n), BAR + 0.15) for n in CHORDS[b])
    pad = filt(pad, 'lowpass', 2600) * adsr(BAR + 0.15, 0.01, 0.15)
    add('pad', bar(b), pad, 0, 0.33)

# drop + per-scene accents
add('fx', BAR, boom(1.6), 0, 0.55)
add('fx', BAR, crash(), 0, 0.35)
add('verb', BAR, crash(), 0, 0.2)
add('fx', BAR + B / 2, whoosh(0.3, 3000, 600, 1.5), 0, 0.3)               # echo outlines
add('fx', bar(1, 1), zap(1800, 220, 0.18), 0.4, 0.35)                     # THINGS
add('fx', bar(1, 2), boom(0.6), 0, 0.25)                                  # MOVE.
for i in range(4):
    add('fx', bar(1, 2) + 0.12 + i * 0.04, tok(300 + 70 * i, 0.12), -0.4 + 0.25 * i, 0.4)
add('fx', bar(1, 2) + 0.30, tok(880), 0.5, 0.45)                          # period lands
add('fx', bar(1, 3) + 0.08, whoosh(0.32, 300, 5000, 1.4, 0.7), 0, 0.4)    # letters launch
arc = np.concatenate([sine_glide(300, 1500, 0.2, 0.8), sine_glide(1500, 380, 0.19, 1.3)])
add('fx', bar(1, 3) + 0.08, arc * 0.13 * np.hanning(len(arc)) ** 0.3, 0.2)

# Bar 2 — Bauhaus: every landing has a voice
add('fx', bar(2), tok(140, 0.4), 0, 0.7)
add('fx', bar(2) + B / 2, whoosh(0.28, 600, 2200, 2), -0.6, 0.3)
add('fx', bar(2) + B / 2 + 0.16, tok(390), -0.5, 0.45)
for k, o in enumerate((0.182, 0.364, 0.455, 0.5)):
    add('fx', bar(2, 1) + o, tok(620 - 40 * k, 0.14), 0.55, 0.5 * (1 - 0.18 * k))
add('fx', bar(2, 1) + 0.3, tok(180, 0.25), 0, 0.45)
for k in range(6):
    add('fx', bar(2) + 0.58 + k * 0.035, bloop(900 + 120 * k, 1300 + 140 * k, 0.07), -0.7 + 0.1 * k, 0.25)
add('fx', bar(2) + 0.70, bloop(90, 55, 0.4), 0, 0.5)                       # half disc
add('fx', bar(2, 2) - 0.1, whoosh(0.75, 4000, 300, 0.9, 0.6), 0, 0.45)    # pull back
for d in range(9):
    add('fx', bar(2, 3) + d * 0.034, tick(1800 + 160 * d, 0.02), (d - 4) / 5, 0.22)

# Bar 3 — neon
add('fx', bar(3), zap(5000, 60, 0.45), 0, 0.5)
add('fx', bar(3), whoosh(0.5, 6000, 400, 1.2), 0, 0.35)
on = [(0, 0.035), (0.07, 0.09), (0.125, 0.72)]
for a0, a1 in on:
    d = a1 - a0
    add('fx', bar(3, 1) + a0, buzz(d, 100) * adsr(d, 0.002, 0.01), -0.2, 0.22)
add('fx', bar(3) + 0.98, buzz(0.04, 100), 0.1, 0.25)
add('fx', bar(3) + 1.22, buzz(0.025, 100), 0.1, 0.25)
for a0, a1 in on:
    d = a1 - a0
    add('fx', bar(3, 2) + a0, buzz(d, 150) * adsr(d, 0.002, 0.01), 0.3, 0.12)
add('fx', bar(3, 3), riser(B + 0.02, 300, 9000), 0, 0.5)
suck = whoosh(0.45, 200, 8000, 1.0, 1.6)
add('fx', BAR * 4 - 0.45, suck, 0, 0.4)

ARP = {3: [55, 60, 64, 67, 72, 76, 79, 76], 4: [55, 59, 62, 67, 71, 74, 79, 74]}
for b, notes in ARP.items():
    for s in range(16):
        n = notes[s % 8]
        p = pluck(n, 0.26, 3000 + 1600 * (s % 4 == 0))
        add('arp', bar(b) + s * S16, p, -0.45 if s % 2 else 0.45, 0.32)
        add('delay', bar(b) + s * S16, p, -0.45 if s % 2 else 0.45, 0.14)

# Bar 4 — chrome
add('fx', bar(4), boom(1.2), 0, 0.45)
add('fx', bar(4), crash(1.6), 0, 0.25)
for n in (81, 84, 88):
    add('fx', bar(4), fm_bell(mtof(n), 2.0, 2.0, 1.5, 1.6), (n - 84) / 8, 0.09)
    add('verb', bar(4), fm_bell(mtof(n), 2.0, 2.0, 1.5, 1.6), 0, 0.08)
for k, a in enumerate((0.3, 0.55, 0.8)):
    add('fx', bar(4) + a, tick(2000, 0.02), (-1) ** k * 0.6, 0.3)
    for j in range(6):
        add('fx', bar(4) + a + 0.12 + j * 0.04, tick(4500 + 200 * j, 0.012), (-1) ** k * 0.6, 0.06)
dive = whoosh(0.5, 5000, 120, 1.0, 0.8)
add('fx', bar(4) + 1.42, dive, 0, 0.5)

# Bar 5 — fluid breakdown (under water)
b5 = bar(5)
place_kick(b5, 0.9)
place_kick(b5 + 2 * B, 0.55, f0=120, adec=8)
add('drums', b5 + 3 * B, clap(), 0, 0.25)
add('verb', b5 + 3 * B, clap(), 0, 0.5)
for s in range(8):
    add('drums', b5 + s * B / 2 + B / 4, filt(hat(0.06, 60), 'lowpass', 3500), 0.3, 0.2)
pad5 = sum(supersaw(mtof(n), BAR + 0.1) for n in CHORDS[5])
pad5 = sweep(pad5, lambda s: 500 + 900 * (s / BAR) ** 2, 'lp', 2.5) * adsr(BAR + 0.1, 0.02, 0.1)
add('pad', b5, pad5, 0, 0.45)
add('bass', b5, np.sin(2 * np.pi * 55 * tt(BAR)) * adsr(BAR, 0.05, 0.1), 0, 0.5)
for i in range(5):
    add('fx', b5 + 0.06 + i * 0.055, bloop(220 + 50 * i, 900 + 120 * i, 0.18), -0.5 + 0.25 * i, 0.4)
for k in range(10):
    tb = b5 + 0.5 + rng.random() * 1.0
    add('fx', tb, bloop(400 + rng.random() * 500, 1500 + rng.random() * 900, 0.08), rng.uniform(-0.8, 0.8), 0.14)
for k in range(10):
    add('fx', b5 + 0.9 + k * 0.035, tick(5000, 0.012), 0, 0.06)
for k in range(9):  # glitch stutters at the tail
    t0 = b5 + 1.6 + k * (0.275 / 9)
    add('fx', t0, zap(rng.uniform(1500, 6000), rng.uniform(80, 400), 0.04), rng.uniform(-0.7, 0.7), 0.35)

# Bar 6 — craft: UI clicks, then the montage build
b6 = bar(6)
add('fx', b6, zap(6000, 200, 0.1), 0, 0.4)
for q in range(4):
    place_kick(b6 + q * B, 0.9 if q < 2 else 1.0)
    add('drums', b6 + q * B + B / 2, hat(), 0.25, 0.3)
add('drums', b6 + B, clap(), 0, 0.5)
add('fx', b6 + B, mx(clap(0.3) * 1.2, tok(160, 0.2)), 0, 0.5)                 # sticker slap
for tc in (0.12, 0.36, 0.46, 0.66):
    add('fx', b6 + tc, mx(tick(1500, 0.02), tick(3000, 0.01)), 0.3, 0.35)    # mouse down / up
keys = [0.04, 1.1, 1.55, 3.3, 3.75, 1.875, 2.34, 2.81, 3.28, 4.69, 5.16, 5.5, 5.63, 6.09, 6.56, 7.03, 7.5, 8.2, 8.9, 9.3, 9.4, 10.3, 11.1, 13.13, 13.6, 14.06]
for k in keys:  # playhead crossing each keyframe (inverse of the inOutQuad sweep)
    u = k / DUR
    e = np.sqrt(u / 2) if u < 0.5 else 1 - np.sqrt((1 - u) / 2)
    add('fx', b6 + 0.04 + e * (2 * B - 0.06), tick(3800 + 900 * (k % 1), 0.012), (u - 0.5) * 1.4, 0.07)
ch6 = [[57, 60, 65, 69], [55, 59, 62, 67]]
for h in range(2):
    d = 2 * B + 0.05
    pad = sum(supersaw(mtof(n), d) for n in ch6[h])
    pad = sweep(pad, lambda s, h=h: 1200 + 3500 * ((h * 2 * B + s) / BAR) ** 2, 'lp', 1.0) * adsr(d, 0.01, 0.05)
    add('pad', b6 + h * 2 * B, pad, 0, 0.3 + 0.1 * h)
    for q in range(4):
        n = [29, 31][h] + 12
        x = saw(mtof(n), B / 2 * 0.9) * adsr(B / 2 * 0.9, 0.003, 0.02)
        add('bass', b6 + h * 2 * B + q * B / 2 + B / 4, filt(x, 'lowpass', 900), 0, 0.5)
for s in range(8):  # montage: one zap per cut + a rolling snare that tightens
    t0 = b6 + 2 * B + s * S16
    add('fx', t0, zap(rng.uniform(2500, 7000), rng.uniform(60, 300), 0.09), rng.uniform(-0.6, 0.6), 0.4)
    add('drums', t0, snare(0.2, 200 + s * 18), 0, 0.25 + 0.04 * s)
    add('drums', t0 + S16 / 2, snare(0.12, 210 + s * 18), 0, 0.15 + 0.035 * s)
add('fx', b6 + 2 * B, riser(2 * B, 400, 12000), 0, 0.55)

# Bar 7 — identity
b7 = bar(7)
place_kick(b7, 1.0)
add('fx', b7, boom(2.4), 0, 0.85)
add('fx', b7, crash(2.4), 0, 0.4)
add('verb', b7, crash(2.4), 0, 0.3)
add('fx', b7 + 0.02, whoosh(0.5, 300, 4000, 1.0, 0.5), 0, 0.35)          # colour stack wipe
add('fx', b7 + 0.34, tok(700), -0.3, 0.55)                                # dot lands
add('fx', b7 + B, whoosh(0.45, 800, 5000, 1.6), -0.2, 0.35)               # sweep reveals the wordmark
for n, o in ((81, 0.42), (88, 0.46), (93, 0.5)):
    add('fx', b7 + B + o, fm_bell(mtof(n), 1.6, 3.5, 2.0, 2.4), (n - 88) / 10, 0.16)
    add('verb', b7 + B + o, fm_bell(mtof(n), 1.6, 3.5, 2.0, 2.4), 0, 0.12)
add('fx', b7 + 2 * B, fm_bell(mtof(76), 1.2, 2.0, 1.0, 3.0), 0, 0.12)
add('fx', b7 + 1.0, bloop(300, 1000, 0.1), 0.5, 0.25)                      # badge
add('fx', b7 + 1.15, bloop(500, 1200, 0.1), -0.5, 0.2)                     # pill
add('fx', b7 + 3 * B, kick(0.5, 90, 40, 20, 7), 0, 0.45)                   # heartbeat
padF = sum(supersaw(mtof(n), 2.0) for n in CHORDS[7])
padF = filt(padF, 'lowpass', 3200) * np.exp(-tt(2.0) * 1.3)
add('pad', b7, padF, 0, 0.4)
add('bass', b7, np.sin(2 * np.pi * 55 * tt(1.9)) * np.exp(-tt(1.9) * 1.5), 0, 0.5)


# ---------------------------------------------------------------- mix
def sidechain():
    env = np.ones(N)
    t = np.arange(N) / SR
    for k in sorted(kick_times):
        i0 = int(k * SR)
        seg = t[i0:] - k
        env[i0:] = np.minimum(env[i0:], 1 - 0.7 * np.exp(-seg * 9))
    return env


def reverb(x, d=2.2):
    t = tt(d)
    ir = np.vstack([rng.standard_normal(len(t)), rng.standard_normal(len(t))]) * np.exp(-t * 3.2)
    ir = np.vstack([filt(ir[0], 'lowpass', 6000), filt(ir[1], 'lowpass', 6000)]) * 0.02
    return np.vstack([signal.fftconvolve(x[0], ir[0])[:N], signal.fftconvolve(x[1], ir[1])[:N]])


def delay(x, dt=B * 0.75, fb=0.38):
    y = np.zeros_like(x)
    n = int(dt * SR)
    src = filt(x[0] + x[1], 'bandpass', [400, 5000]) * 0.5
    tap, g, side = src, 1.0, 0
    for _ in range(6):
        g *= fb
        tap = np.concatenate([np.zeros(n), tap[:-n]])
        y[side] += tap * g / fb
        side ^= 1
    return y


sc = sidechain()
mix = (BUS['kick'] * 1.0 + BUS['drums'] * 0.9 + BUS['bass'] * sc * 0.9 + BUS['pad'] * sc * 0.75
       + BUS['arp'] * sc * 0.8 + BUS['fx'] * 0.9 + delay(BUS['delay']) * 0.6 + reverb(BUS['verb'] + BUS['pad'] * 0.15 + BUS['fx'] * 0.12))
mix = np.vstack([filt(mix[0], 'highpass', 25), filt(mix[1], 'highpass', 25)])

# glue compressor (one-pole envelope, 3:1 above -14 dBFS)
peak = np.abs(mix).max()
mix /= peak
lvl = np.maximum(np.abs(mix[0]), np.abs(mix[1]))
a = np.exp(-1 / (0.06 * SR))
envl = signal.lfilter([1 - a], [1, -a], lvl)
thr = 10 ** (-14 / 20)
gain = np.where(envl > thr, (thr / np.maximum(envl, 1e-9)) ** (1 - 1 / 3), 1.0)
mix *= gain
mix = np.tanh(mix * 2.2) / np.tanh(2.2)
mix *= 0.89 / np.abs(mix).max()
# arrangement dynamics: the fluid breakdown sits back, the glitch claws its way out
tm = np.arange(N) / SR
auto = 1 - 0.33 * np.clip((tm - 5 * BAR) / 0.05, 0, 1) * np.clip((5 * BAR + 1.55 - tm) / 0.3, 0, 1)
mix *= auto
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
