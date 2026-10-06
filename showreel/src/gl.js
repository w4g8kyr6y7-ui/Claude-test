// WebGL2 shader passes (tunnel, chrome raymarch, fluid). Each renders into one
// shared canvas that the 2D compositor then draws like an image.
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
`;

const TUNNEL = COMMON + `
uniform float uZ, uRoll, uFade, uPulse;
float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.8660254, 0.5)), p.y); }
vec3 ringCol(float i){
  float k = mod(i, 4.0);
  return k < 1.0 ? vec3(1.0, 0.17, 0.84) : k < 2.0 ? vec3(0.18, 0.95, 1.0) : k < 3.0 ? vec3(0.55, 0.25, 1.0) : vec3(0.18, 0.95, 1.0);
}
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p = rot(uRoll) * p;
  float r = max(hexd(p), 1e-3);
  float zz = 0.85 / r + uZ;
  float f = fract(zz);
  float ridx = f < 0.5 ? floor(zz) : floor(zz) + 1.0;
  float sd = min(f, 1.0 - f) * r * r / 0.85;
  float w = 0.0012 + 0.005 * r;
  float g = w / (sd + w * 0.7);
  float core = smoothstep(w * 0.9, 0.0, sd);
  float fog = smoothstep(0.01, 0.3, r);
  float beat = 1.0 + 1.6 * uPulse * step(0.5, fract(ridx * 0.25));
  vec3 col = ringCol(ridx) * (g * g * 0.35 + core * 1.4) * fog * beat;
  // rails along the hexagon corners, with dashes racing toward camera
  float a = atan(p.y, p.x);
  float seg = 1.0471976;
  float ad = abs(mod(a, seg) - seg * 0.5);
  ad = seg * 0.5 - ad;
  float rd = ad * length(p);
  float dash = smoothstep(0.35, 0.5, fract(zz * 1.5)) * smoothstep(0.65, 0.5, fract(zz * 1.5));
  col += vec3(0.6, 0.4, 1.0) * (0.0025 / (rd + 0.0025)) * fog * (0.25 + 0.9 * dash);
  // vanishing point bloom
  col += vec3(0.55, 0.3, 1.0) * 0.012 / (length(p) + 0.03);
  col = 1.0 - exp(-col * 1.15);
  o = vec4(col * uFade, 1.0);
}`;

const CHROME = COMMON + `
uniform float uT, uScale, uPulse, uMerge, uCamA;
float sdRB(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float map(vec3 p){
  float s = max(uScale, 1e-3);
  p /= s;
  vec3 q = p;
  q.xz *= rot(uT * 0.9);
  q.xy *= rot(uT * 0.6 + 0.4);
  q.xz *= rot(q.y * 0.9 * sin(uT * 1.3));
  float d = sdRB(q, vec3(0.6), 0.24);
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float a = uT * (1.1 + 0.25 * fi) + fi * 1.5708;
    float R = (1.3 + 0.12 * sin(uT * 2.0 + fi) + uPulse * 0.1) * (1.0 - uMerge);
    vec3 c = vec3(cos(a) * R, sin(a * 1.3 + fi) * 0.55 * (1.0 - uMerge), sin(a) * R);
    d = smin(d, length(p - c) - (0.3 + 0.04 * fi), 0.45 + uMerge * 0.4);
  }
  return d * s * 0.75;
}
vec3 env(vec3 d){
  vec3 top = vec3(0.62, 0.56, 1.0), mid = vec3(1.0, 0.78, 0.86), low = vec3(1.0, 0.84, 0.72), floorc = vec3(0.11, 0.06, 0.2);
  vec3 col = mix(low, mid, smoothstep(-0.05, 0.25, d.y));
  col = mix(col, top, smoothstep(0.2, 0.8, d.y));
  col = mix(col, floorc, smoothstep(-0.02, -0.3, d.y));
  col += 3.5 * pow(max(dot(d, normalize(vec3(-0.6, 0.7, -0.5))), 0.0), 60.0);
  col += 2.0 * smoothstep(0.1, 0.0, abs(d.x - 0.8)) * smoothstep(-0.1, 0.5, d.y) * smoothstep(0.6, 0.0, d.z);
  col += vec3(1.0, 0.45, 0.75) * 1.4 * pow(max(dot(d, normalize(vec3(0.4, 0.1, 1.0))), 0.0), 6.0);
  col += vec3(0.3, 0.8, 1.0) * 1.0 * pow(max(dot(d, normalize(vec3(-0.9, -0.1, 0.4))), 0.0), 10.0);
  return col;
}
vec3 calcN(vec3 p){
  const vec2 e = vec2(1.0, -1.0) * 0.0009;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.35, -7.0);
  ro.xz *= rot(uCamA);
  vec3 ww = normalize(-ro), uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0))), vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);
  float t = 0.5, dmin = 1e9, tmin = 0.5;
  bool hit = false;
  for (int i = 0; i < 110; i++){
    vec3 p = ro + rd * t;
    float d = map(p);
    float ratio = d / t;
    if (ratio < dmin){ dmin = ratio; tmin = t; }
    if (d < 0.0006 * t){ hit = true; break; }
    t += d;
    if (t > 16.0) break;
  }
  float pix = 1.0 / (uRes.y * 1.5);
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, pix * 1.6, dmin);
  if (alpha <= 0.0){ o = vec4(0.0); return; }
  vec3 p = ro + rd * (hit ? t : tmin);
  vec3 n = calcN(p);
  vec3 r = reflect(rd, n);
  float fre = pow(1.0 - max(dot(-rd, n), 0.0), 2.5);
  vec3 irid = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + fre * 1.1 + n.y * 0.3 + uT * 0.08));
  vec3 col = env(r) * mix(vec3(0.92), irid * 1.35, 0.45 + 0.5 * fre);
  float ao = clamp(map(p + n * 0.25) / 0.25, 0.0, 1.0);
  col *= 0.55 + 0.45 * ao;
  col = col / (1.0 + col * 0.3);
  o = vec4(col * alpha, alpha);
}`;

const FLUID = COMMON + `
uniform float uT, uBlob, uIn;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){ v += a * n2(p); p = m * p; a *= 0.5; } return v * 1.07; }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uT;
  vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, t * 0.3)), fbm(p * 1.3 + vec2(5.2, 1.3) - t * 0.25));
  vec2 r = vec2(fbm(p * 1.5 + 2.8 * q + vec2(1.7, 9.2) + t * 0.35), fbm(p * 1.5 + 2.8 * q + vec2(8.3, 2.8) - t * 0.3));
  float f = fbm(p * 1.2 + 2.5 * r);
  vec3 c1 = vec3(0.09, 0.02, 0.22), c2 = vec3(0.98, 0.16, 0.5), c3 = vec3(1.0, 0.48, 0.1), c4 = vec3(1.0, 0.9, 0.8), c5 = vec3(0.42, 0.3, 1.0);
  vec3 col = mix(c1, c5, smoothstep(0.25, 0.6, f));
  col = mix(col, c2, smoothstep(0.45, 0.85, length(q)));
  col = mix(col, c3, smoothstep(0.55, 0.9, r.x) * 0.85);
  col = mix(col, c4, smoothstep(0.78, 1.05, f + 0.25 * r.y) * 0.55);
  float field = 0.0; vec2 grad = vec2(0.0);
  for (int i = 0; i < 8; i++){
    float fi = float(i);
    vec2 c = vec2(sin(t * (0.9 + 0.17 * fi) + fi * 2.1) * 0.7, cos(t * (0.75 + 0.13 * fi) + fi * 1.3) * 0.36);
    float rr = (0.05 + 0.022 * mod(fi, 3.0)) * uBlob;
    vec2 d = p - c; float dd = dot(d, d) + 1e-5;
    field += rr * rr / dd;
    grad += -2.0 * rr * rr * d / (dd * dd);
  }
  float e = fwidth(field) * 1.2;
  float m = smoothstep(1.0 - e, 1.0 + e, field);
  vec3 nrm = normalize(vec3(-grad / max(field * field, 1.0) * 0.045, 1.0));
  vec3 L = normalize(vec3(-0.5, 0.6, 0.65));
  float spec = pow(max(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
  float rim = pow(1.0 - nrm.z, 2.0);
  vec3 blob = vec3(0.08, 0.03, 0.18) * (0.6 + 0.4 * dot(nrm, L)) + rim * mix(c2, c3, 0.5 + 0.5 * nrm.x) * 1.2 + spec * 1.1;
  col = mix(col, blob, m);
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
  programs.chrome = compile(CHROME);
  programs.fluid = compile(FLUID);
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
    else gl.uniform1f(P.loc[k], v);
  }
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return glCanvas;
}
