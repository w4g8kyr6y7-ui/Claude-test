// WebGL2 passes: speed tunnel (F1), the can (raymarched, textured label with
// condensation), and the ocean (surf / cliff diving). All composited into Canvas 2D.
import { W, H } from './util.js';

export const glCanvas = document.createElement('canvas');
glCanvas.width = W;
glCanvas.height = H;
const gl = glCanvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false });

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uRes;
out vec4 o;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float h1(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){ v += a * n2(p); p = m * p; a *= 0.5; } return v * 1.07; }
`;

// Hex speed tunnel; rings alternate like kerbs (red / white) with a blue accent.
const TUNNEL = COMMON + `
uniform float uZ, uRoll, uFade, uPulse;
uniform vec3 uA, uB, uC;
float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.8660254, 0.5)), p.y); }
vec3 ringCol(float i){ return mod(i, 8.0) < 1.0 ? uC : mod(i, 2.0) < 1.0 ? uA : uB; }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p = rot(uRoll) * p;
  float r = max(hexd(p), 1e-3);
  float zz = 0.85 / r + uZ;
  float f = fract(zz);
  float ridx = f < 0.5 ? floor(zz) : floor(zz) + 1.0;
  float sd = min(f, 1.0 - f) * r * r / 0.85;
  float w = 0.0012 + 0.006 * r;
  float g = w / (sd + w * 0.7);
  float core = smoothstep(w * 0.9, 0.0, sd);
  float fog = smoothstep(0.01, 0.3, r);
  float beat = 1.0 + 1.4 * uPulse * step(0.5, fract(ridx * 0.25));
  vec3 col = ringCol(ridx) * (g * g * 0.3 + core * 1.3) * fog * beat;
  float a = atan(p.y, p.x);
  float seg = 1.0471976;
  float ad = seg * 0.5 - abs(mod(a, seg) - seg * 0.5);
  float rd = ad * length(p);
  float dash = smoothstep(0.3, 0.5, fract(zz * 2.0)) * smoothstep(0.7, 0.5, fract(zz * 2.0));
  col += mix(uB, uC, 0.5) * (0.0025 / (rd + 0.0025)) * fog * (0.2 + 0.9 * dash);
  col += vec3(1.0, 0.85, 0.75) * 0.01 / (length(p) + 0.03);
  col = 1.0 - exp(-col * 1.15);
  o = vec4(col * uFade, 1.0);
}`;

// The can: revolved SDF, label texture, aluminium lid, condensation droplets, frost.
const CAN = COMMON + `
uniform sampler2D uLabel;
uniform float uRot, uScale, uTilt, uCamY, uZoom, uDew, uFrost;
const float CR = 0.62, CH = 1.12, LH = 0.9;
float sdCan(vec3 p){
  float neck = smoothstep(CH - 0.26, CH - 0.03, p.y);
  float foot = smoothstep(-CH + 0.18, -CH + 0.02, p.y);
  float r = CR - 0.085 * neck - 0.07 * foot;
  vec2 w = vec2(length(p.xz) - r, abs(p.y) - CH);
  const float rr = 0.04;
  w += rr;
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - rr;
}
vec3 toCan(vec3 p){ p /= max(uScale, 1e-3); p.xy = rot(uTilt) * p.xy; return p; }
float map(vec3 p){ return sdCan(toCan(p)) * max(uScale, 1e-3) * 0.85; }
vec3 calcN(vec3 p){
  const vec2 e = vec2(1.0, -1.0) * 0.0008;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}
vec3 env(vec3 d){
  vec3 col = mix(vec3(0.82, 0.9, 1.0), vec3(0.32, 0.5, 0.88), smoothstep(-0.1, 0.8, d.y));
  col = mix(col, vec3(0.04, 0.07, 0.16), smoothstep(0.0, -0.45, d.y));
  float front = smoothstep(0.4, -0.2, d.z);
  col += 3.2 * smoothstep(0.1, 0.0, abs(d.x + 0.58)) * smoothstep(-0.3, 0.5, d.y) * front;
  col += 2.2 * smoothstep(0.06, 0.0, abs(d.x - 0.72)) * smoothstep(-0.3, 0.5, d.y) * front;
  col += 1.6 * pow(max(dot(d, normalize(vec3(0.0, 1.0, -0.4))), 0.0), 16.0);
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, uCamY, -6.0);
  vec3 ww = normalize(vec3(0.0, 0.05, 0.0) - ro), uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww)), vv = cross(ww, uu);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + uZoom * ww);
  float t = 0.5, dmin = 1e9, tmin = 0.5;
  bool hit = false;
  for (int i = 0; i < 100; i++){
    vec3 p = ro + rd * t;
    float d = map(p);
    float ratio = d / t;
    if (ratio < dmin){ dmin = ratio; tmin = t; }
    if (d < 0.0005 * t){ hit = true; break; }
    t += d;
    if (t > 14.0) break;
  }
  float pix = 1.0 / (uRes.y * uZoom);
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, pix * 1.6, dmin);
  if (alpha <= 0.0){ o = vec4(0.0); return; }
  vec3 p = ro + rd * (hit ? t : tmin);
  vec3 n = calcN(p);
  vec3 q = toCan(p);
  vec3 nq = n; nq.xy = rot(uTilt) * nq.xy;
  float ang = atan(q.z, q.x);
  float u = fract(ang / 6.2831853 + uRot);
  vec3 base; float metal;
  if (abs(q.y) < LH){
    base = texture(uLabel, vec2(u, (LH - q.y) / (2.0 * LH))).rgb;
    metal = 0.55;
  } else {
    float rr = length(q.xz);
    base = vec3(0.8, 0.82, 0.86) * (q.y > 0.0 ? 0.9 + 0.1 * sin(rr * 80.0) : 1.0);
    metal = 0.95;
  }
  // condensation droplets: sparse voronoi domes in (circumference, height) space
  vec2 g = vec2(u * 78.0, q.y * 22.0);
  vec2 id = floor(g), f = fract(g);
  float best = 9.0; vec2 bo = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 nb = vec2(float(i), float(j));
    vec2 cid = id + nb; cid.x = mod(cid.x, 78.0);
    if (h(cid + 11.7) > 0.62) continue;
    float rad = 0.14 + 0.32 * h(cid + 7.3) * h(cid + 3.1);
    vec2 dv = (f - nb - vec2(h(cid), h(cid + 19.1))) / rad;
    float d = length(dv);
    if (d < best){ best = d; bo = dv; }
  }
  float drop = (1.0 - smoothstep(0.8, 1.0, best)) * uDew * step(abs(q.y), CH - 0.05);
  vec3 T = normalize(vec3(-sin(ang), 0.0, cos(ang)));
  nq = normalize(nq + (T * bo.x + vec3(0.0, 1.0, 0.0) * bo.y) * 0.9 * drop);
  n = nq; n.xy = rot(-uTilt) * n.xy;

  vec3 L = normalize(vec3(-0.5, 0.6, -0.65));
  float diff = 0.35 + 0.65 * max(dot(n, L), 0.0);
  vec3 r = reflect(rd, n);
  vec3 e = env(r);
  float fre = pow(1.0 - max(dot(-rd, n), 0.0), 4.0);
  vec3 col = base * diff * (1.0 - 0.45 * metal) + e * mix(base, vec3(1.0), 0.3) * 0.5 * metal + e * fre * 0.35;
  col *= 1.0 - 0.12 * drop;
  col += pow(max(dot(r, L), 0.0), 80.0) * 2.0 * (0.4 + drop);
  float frost = uFrost * smoothstep(0.1, -1.0, q.y) * (0.55 + 0.45 * n2(g * 0.6));
  col = mix(col, vec3(0.9, 0.95, 1.0), frost * 0.55);
  col = col / (1.0 + col * 0.25);
  o = vec4(col * alpha, alpha);
}`;

// Underwater: domain-warped ocean, caustics, god rays and rising carbonation bubbles.
const OCEAN = COMMON + `
uniform float uT, uBub, uIn, uRays;
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uT;
  vec2 q = vec2(fbm(p * 1.1 + vec2(0.0, t * 0.2)), fbm(p * 1.1 + vec2(5.2, 1.3) - t * 0.15));
  vec2 r = vec2(fbm(p * 1.4 + 2.2 * q + vec2(1.7, 9.2) + t * 0.25), fbm(p * 1.4 + 2.2 * q + vec2(8.3, 2.8) - t * 0.2));
  float f = fbm(p * 1.1 + 2.0 * r);
  vec3 deep = vec3(0.02, 0.08, 0.3), mid = vec3(0.04, 0.4, 0.78), teal = vec3(0.0, 0.72, 0.88), turq = vec3(0.4, 0.96, 0.95), foam = vec3(0.9, 0.98, 1.0);
  float depth = smoothstep(0.55, -0.7, p.y) * 0.85;
  vec3 col = mix(mid, deep, depth);
  col = mix(col, teal, smoothstep(0.35, 0.85, f) * (1.0 - depth * 0.6));
  col = mix(col, turq, smoothstep(0.62, 0.95, r.x) * 0.45 * (1.0 - depth));
  float c = pow(abs(sin(p.x * 9.0 + r.y * 6.0 + t * 1.5) * sin(p.y * 7.0 - q.x * 5.0 + t)), 6.0) * smoothstep(-0.2, 0.5, p.y);
  col += foam * c * 0.5;
  float ray = pow(max(0.0, sin(p.x * 6.0 + p.y * 2.2 + 1.3) * sin(p.x * 2.7 - p.y * 0.6 + t * 0.35)), 3.0);
  col += vec3(0.6, 0.95, 1.0) * ray * smoothstep(-0.6, 0.55, p.y) * 0.5 * uRays;
  float field = 0.0; vec2 grad = vec2(0.0);
  for (int i = 0; i < 16; i++){
    float fi = float(i);
    float sp = 0.16 + 0.14 * h1(fi * 3.7);
    vec2 cc = vec2(-0.85 + 1.7 * h1(fi + 1.3) + 0.025 * sin(t * 5.0 + fi * 2.0), mod(h1(fi * 2.9) * 1.6 + t * sp, 1.6) - 0.8);
    float rr = (0.012 + 0.03 * h1(fi * 5.1)) * uBub;
    vec2 d = p - cc; float dd = dot(d, d) + 1e-5;
    field += rr * rr / dd;
    grad += -2.0 * rr * rr * d / (dd * dd);
  }
  float e = fwidth(field) * 1.2;
  float m = smoothstep(1.0 - e, 1.0 + e, field);
  vec3 nrm = normalize(vec3(-grad / max(field * field, 1.0) * 0.03, 1.0));
  float rim = pow(1.0 - nrm.z, 1.5);
  float spec = pow(max(dot(reflect(normalize(vec3(0.4, -0.6, -0.7)), nrm), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
  vec3 bub = col * 1.25 + vec3(0.8, 0.97, 1.0) * rim * 1.6 + spec * 1.5;
  col = mix(col, bub, m);
  o = vec4(col * uIn, 1.0);
}`;

function compile(fs) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return { prog, loc: {} };
}

const programs = {};
export function initGL() {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  programs.tunnel = compile(TUNNEL);
  programs.can = compile(CAN);
  programs.ocean = compile(OCEAN);
}

export function setTexture(canvas) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export function shade(name, uniforms) {
  const P = programs[name];
  gl.viewport(0, 0, W, H);
  gl.useProgram(P.prog);
  const all = { uRes: [W, H], ...uniforms };
  for (const k in all) {
    if (!(k in P.loc)) P.loc[k] = gl.getUniformLocation(P.prog, k);
    const v = all[k];
    if (Array.isArray(v)) gl[`uniform${v.length}fv`](P.loc[k], v);
    else if (k === 'uLabel') gl.uniform1i(P.loc[k], v);
    else gl.uniform1f(P.loc[k], v);
  }
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return glCanvas;
}
