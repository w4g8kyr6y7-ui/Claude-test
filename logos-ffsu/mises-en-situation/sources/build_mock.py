# Clean rebuilds of the FFSU licence card (identity part) and of the sport-u.com home page, with the "Coq Élan" logo.
import math, os, sys
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))

FONTS = """
@font-face{font-family:Mont;font-weight:500;src:url(Montserrat500.ttf)}
@font-face{font-family:Mont;font-weight:600;src:url(Montserrat600.ttf)}
@font-face{font-family:Mont;font-weight:800;src:url(Montserrat800.ttf)}
@font-face{font-family:Osw;font-weight:500;src:url(Oswald500.ttf)}
@font-face{font-family:Osw;font-weight:600;src:url(Oswald600.ttf)}
@font-face{font-family:Exo;font-weight:900;font-style:italic;src:url(Exo2BlackItalic.ttf)}
@font-face{font-family:Rob;font-weight:400;src:url(Roboto400.ttf)}
@font-face{font-family:Rob;font-weight:500;src:url(Roboto500.ttf)}
*{box-sizing:border-box;margin:0;padding:0}
"""

def halftone(w, h, step, bands, opacity=1.0):
    """Halftone dot field: each band = (colour, x_from, x_to, wave_y0, amp, period, thickness, rmax)."""
    out = []
    for j in range(int(h / step) + 2):
        for i in range(int(w / step) + 2):
            x, y = i * step + (step / 2 if j % 2 else 0), j * step
            for col, xa, xb, y0, amp, per, th, rmax in bands:
                if not (xa <= x <= xb): continue
                edge = min(1, (x - xa) / 120, (xb - x) / 120) if xb - xa > 240 else 1
                yc = y0 + amp * math.sin(x / per)
                f = math.exp(-((y - yc) / th) ** 2) * max(0, edge)
                r = rmax * f
                if r > 0.35:
                    out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{col}"/>')
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="position:absolute;left:0;top:0;opacity:{opacity}">' + ''.join(out) + '</svg>'

def mysportu(scale, color, u_img, url_color=None, url=True):
    """'my sport U' wordmark: stacked italic words, the U is the new symbol."""
    s = scale
    uc = url_color or color
    return f'''<div style="position:relative;display:inline-flex;align-items:flex-end;gap:{4*s}px">
      <div style="display:flex;flex-direction:column;align-items:flex-end;line-height:.78">
        <span style="font:italic 900 {38*s}px Exo;color:{color};margin-right:{10*s}px">my</span>
        <span style="font:italic 900 {44*s}px Exo;color:{color};letter-spacing:{-0.5*s}px">sport</span>
        {f'<span style="font:600 italic {9.5*s}px Mont;color:{uc};margin-top:{7*s}px;margin-right:{2*s}px">mysportu.com</span>' if url else ''}
      </div>
      <img src="{u_img}" style="height:{70*s}px;margin-bottom:{(14 if url else 2)*s}px">
    </div>'''

# ---------------------------------------------------------------- licence card (identity part only)
def card_html():
    hw, hh = 700, 150
    ht = halftone(hw, hh, 8, [('#2F7FE8', 0, 300, 40, 26, 55, 34, 2.6), ('#D23A93', 430, 700, 115, 20, 48, 30, 2.6)], 0.85)
    body_dots = halftone(700, 300, 9, [('#C9D3E6', 380, 700, 30, 18, 60, 50, 1.6)], 0.9)
    bars = ''.join(f'<div style="flex:1;height:9px;border-radius:5px;background:{c}"></div>'
                   for c in ('#1F5FBF', '#D92B33', '#F2D024', '#3DA65A', '#121212'))
    rows = [('Licence N° :', '00000000', True), ('Assurance Individuelle Accident :', 'Oui', False),
            ('Sexe :', 'M  ·  Né le : 01/01/2005', False), ('Statut :', 'Étudiant', False),
            ('Type étab. :', 'Université', False), ('Ligue :', 'Auvergne-Rhône-Alpes', False),
            ('Site :', 'Lyon', False), ('AS :', 'Université Jean Moulin Lyon 3', False)]
    fields = ''.join(f'<div style="font:{500 if b else 400} {21 if b else 19}px Rob;color:#1B1B1B;margin-top:{6 if b else 3}px">'
                     f'<span style="font-weight:{600 if b else 500}">{k}</span> {v}</div>' for k, v, b in rows)
    silhouette = ('<svg viewBox="0 0 140 170" width="140" height="170"><rect width="140" height="170" rx="10" fill="#E4E8F0"/>'
                  '<circle cx="70" cy="64" r="30" fill="#B7C0D0"/><path d="M14,170 C18,122 42,104 70,104 C98,104 122,122 126,170 Z" fill="#B7C0D0"/></svg>')
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}
body{{width:700px;background:#fff;font-family:Rob}}
</style></head><body>
<div style="position:relative;height:{hh}px;background:radial-gradient(ellipse at 18% 30%,#13246E 0%,rgba(19,36,110,0) 55%),radial-gradient(ellipse at 85% 80%,#3A0F5C 0%,rgba(58,15,92,0) 55%),linear-gradient(90deg,#070C40,#06033A 55%,#0B0533);overflow:hidden">
  {ht}
  <img src="coq_elan_blanc.png" style="position:absolute;left:28px;top:23px;height:104px">
  <div style="position:absolute;left:158px;top:0;height:{hh}px;display:flex;align-items:center;gap:10px;font:800 33px Mont;color:#fff;letter-spacing:.4px">
    <span>LICENCE</span><span style="color:#4BA6F2">2026</span><span style="width:2px;height:34px;background:rgba(255,255,255,.75)"></span><span style="color:#E8368F">2027</span>
  </div>
  <div style="position:absolute;right:24px;top:40px">{mysportu(0.62, '#FFFFFF', 'coq_elan_blanc.png')}</div>
</div>
<div style="display:flex;gap:10px;padding:12px 22px 0">{bars}</div>
<div style="position:relative;padding:14px 30px 26px">
  <div style="position:absolute;left:0;top:0;right:0;height:300px;overflow:hidden">{body_dots}</div>
  <div style="position:relative;font:500 22px Rob;color:#1B1B1B">Sportive</div>
  <div style="position:relative;display:flex;gap:30px;margin-top:22px;align-items:flex-start">
    <div style="margin-top:6px">{silhouette}</div>
    <div><div style="font:500 24px Rob;color:#1B1B1B">Prénom NOM</div>{fields}</div>
  </div>
  <div style="position:relative;margin-top:26px;border-top:1.5px solid #9AA3B5;padding:12px 0;font:400 20px Rob;color:#1B1B1B"><span style="font-weight:500">Discipline principale :</span> Football</div>
  <div style="position:relative;border-top:1.5px solid #9AA3B5;border-bottom:1.5px solid #9AA3B5;padding:12px 0;font:400 20px Rob;color:#1B1B1B"><span style="font-weight:500">Sport(s) à contrainte :</span> Aucun</div>
</div>
</body></html>'''

# ---------------------------------------------------------------- sport-u.com home page
def icon(name):
    s = 'fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'
    return {
        'user': f'<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" {s}/><circle cx="12" cy="10" r="3.6" {s}/><path d="M5.5,19 C7,15.8 9.2,14.6 12,14.6 C14.8,14.6 17,15.8 18.5,19" {s}/></svg>',
        'mail': f'<svg width="26" height="20" viewBox="0 0 26 20"><rect x="1.5" y="1.5" width="23" height="17" rx="2" fill="#fff"/><path d="M2.5,3 L13,11 L23.5,3" fill="none" stroke="#017DA1" stroke-width="2.2"/></svg>',
        'f': '<svg width="14" height="22" viewBox="0 0 14 22"><path d="M9,22 V12.5 H12.5 L13,8.6 H9 V6.2 C9,5 9.4,4.3 11,4.3 H13.1 V0.8 C12.7,0.7 11.4,0.6 9.9,0.6 C6.8,0.6 4.9,2.4 4.9,5.8 V8.6 H1.5 V12.5 H4.9 V22 Z" fill="#fff"/></svg>',
        'x': '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M1,1 L17,17 M17,1 L1,17" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
        'ig': f'<svg width="20" height="20" viewBox="0 0 20 20"><rect x="1.5" y="1.5" width="17" height="17" rx="5" {s}/><circle cx="10" cy="10" r="4" {s}/><circle cx="15" cy="5" r="1.2" fill="#fff"/></svg>',
        'yt': '<svg width="22" height="16" viewBox="0 0 22 16"><rect x="0.5" y="0.5" width="21" height="15" rx="4" fill="#fff"/><path d="M9,4.5 L15,8 L9,11.5 Z" fill="#017DA1"/></svg>',
    }[name]

def speed_lines(side, w, h):
    # white translucent speed lines echoing the logo, drawn into the hero
    lines = [(70, 300, 9), (120, 420, 7), (170, 260, 11), (225, 380, 7), (285, 330, 9), (330, 230, 6)]
    out = []
    for y, ln, th in lines:
        if side == 'L':
            out.append(f'<path d="M{40 + (y % 90)},{y} L{40 + (y % 90) + ln},{y - th / 2} L{40 + (y % 90) + ln},{y + th / 2} Z" fill="#fff" opacity=".55"/>')
        else:
            x = w - 40 - (y % 90)
            out.append(f'<path d="M{x},{y} L{x - ln},{y - th / 2} L{x - ln},{y + th / 2} Z" fill="#fff" opacity=".5"/>')
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="position:absolute;left:0;top:0">' + ''.join(out) + '</svg>'

def picto(kind):
    s = 'fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"'
    if kind == 'as':      # people meeting around a table
        return (f'<svg width="230" height="200" viewBox="0 0 230 200"><circle cx="70" cy="48" r="22" fill="#fff"/><circle cx="160" cy="48" r="22" fill="#fff"/>'
                f'<path d="M30,150 C30,105 48,86 70,86 C92,86 105,100 108,120" {s}/><path d="M200,150 C200,105 182,86 160,86 C138,86 125,100 122,120" {s}/>'
                f'<path d="M20,150 H210" {s}/><path d="M85,150 L95,124 H135 L145,150" {s}/></svg>')
    return (f'<svg width="230" height="200" viewBox="0 0 230 200"><circle cx="140" cy="34" r="20" fill="#fff"/>'
            f'<path d="M128,66 L104,118 L66,130" {s}/><path d="M104,118 L132,150 L120,192" {s}/><path d="M128,66 L172,90 L200,74" {s}/>'
            f'<path d="M124,72 L90,82 L70,62" {s}/></svg>')

def site_html():
    W, Hh = 2000, 1003
    nav = ''.join(f'<span>{t}</span>' for t in ('NEWS', 'LA FF SPORT U', 'NATIONAL', 'INTERNATIONAL', 'FORMATION', 'COM', 'PARASPORT-U', 'FAQ'))
    social = ''.join(f'<span style="width:36px;height:36px;background:#5FB9D6;display:grid;place-items:center">{icon(k)}</span>' for k in ('f', 'x', 'ig', 'yt'))
    def card(kind, grad, label):
        return (f'<div style="width:380px;height:330px;border-radius:18px;background:{grad};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;box-shadow:0 10px 30px rgba(0,40,70,.12)">'
                f'{picto(kind)}<span style="font:600 30px Osw;color:#fff;letter-spacing:1px">{label}</span></div>')
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}
body{{width:{W}px;height:{Hh}px;overflow:hidden;background:#fff;font-family:Rob}}
.top{{height:56px;background:#017DA1;display:flex;align-items:center;padding:0 120px 0 136px;color:#fff}}
.nav{{height:70px;background:#017DA1;display:flex;align-items:center;padding:0 120px 0 112px;color:#fff}}
.nav .items{{margin-left:auto;display:flex;gap:33px;font:600 26px Osw;letter-spacing:.3px}}
</style></head><body>
<div class="top">
  <span style="font:400 19px Rob;letter-spacing:.6px">FÉDÉRATION FRANÇAISE DU SPORT UNIVERSITAIRE</span>
  <div style="margin-left:auto;display:flex;align-items:center;gap:30px;font:500 22px Osw">
    <span style="display:flex;align-items:center;gap:8px"><span style="width:16px;height:16px;border-radius:50%;background:#E3242B"></span>JE SIGNALE</span>
    <span style="display:flex;align-items:center;gap:8px">{icon('user')}MY SPORT U</span>
    <span style="display:flex;align-items:center;gap:8px">{icon('mail')}CONTACT</span>
    <span style="display:flex;gap:4px">{social}</span>
  </div>
</div>
<div class="nav">
  <img src="coq_elan_blanc.png" style="height:64px;margin-top:-6px">
  <span style="font:600 32px Osw;margin-left:16px;letter-spacing:.4px">SPORT-U.COM</span>
  <div class="items">{nav}</div>
</div>
<div style="position:relative;height:440px;background:linear-gradient(90deg,#2C93BC 0%,#9CCFE2 22%,#FFFFFF 43%,#FFFFFF 57%,#F2A3AB 78%,#DD2333 100%);overflow:hidden">
  {speed_lines('L', W, 440)}{speed_lines('R', W, 440)}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0) 45%,#fff 100%)"></div>
  <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:800px;height:440px;background:radial-gradient(ellipse at 50% 55%,#fff 0%,rgba(255,255,255,.92) 45%,rgba(255,255,255,0) 72%)"></div>
  <div style="position:absolute;left:0;right:0;top:40px;text-align:center;font:600 46px Osw;color:#2B2B2B;letter-spacing:.5px">J'ACCÈDE À MON ESPACE</div>
  <div style="position:absolute;left:50%;top:112px;transform:translateX(-50%)">{mysportu(2.75, '#0E74A6', 'coq_elan_couleur.png', '#0E74A6')}</div>
</div>
<div style="text-align:center;font:600 46px Osw;color:#2B2B2B;margin-top:22px;letter-spacing:.5px">JE SUIS</div>
<div style="display:flex;justify-content:center;gap:90px;margin-top:44px">
  {card('as', 'linear-gradient(160deg,#F2B8BF 0%,#C8283A 100%)', 'UNE ASSOCIATION SPORTIVE')}
  {card('etu', 'linear-gradient(160deg,#A9D7EA 0%,#127FA9 100%)', 'UN·E ÉTUDIANT·E')}
</div>
</body></html>'''

open(os.path.join(D, 'carte.html'), 'w').write(card_html())
open(os.path.join(D, 'site.html'), 'w').write(site_html())
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 700, 'height': 600}, device_scale_factor=3)
    pg.goto('file://' + os.path.join(D, 'carte.html')); pg.wait_for_timeout(500)
    pg.screenshot(path=os.path.join(D, 'carte_coq_elan.png'), full_page=True)
    pg = b.new_page(viewport={'width': 2000, 'height': 1003}, device_scale_factor=1.5)
    pg.goto('file://' + os.path.join(D, 'site.html')); pg.wait_for_timeout(500)
    pg.screenshot(path=os.path.join(D, 'site_coq_elan.png'))
    b.close()
print('ok')
