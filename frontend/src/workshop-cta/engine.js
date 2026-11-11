// Workshop CTA overlay for StreamYard: the approved box and name bar come pre-rendered in
// base_top.png / base_bottom.png (one tile per frame); only the promo code tag is drawn here.
// exportGif() writes the same GIF as the original Python pipeline: 91 frames at 25 fps,
// delta frames over a fixed palette, frame 60 held so the loop is exactly 10 minutes.
import { META, PALETTE } from "./base.js";

export const FRAMES = META.frames;
export const HOLD = META.hold;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** Covers the box and the name bar; the rest of the frame is always transparent. */
export const AREA = { x: 1160, y: 20, w: 760, h: 980 };

const FONT = '"IBM Plex Sans Arabic"';
const TRANSPARENT = 255;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;

/** How far the tag has swung in and how many letters show, on the approved timeline. */
function tagState(frame) {
  if (frame <= HOLD) return { swing: easeOut(lin(frame, 46, 51)), chars: lin(frame, 49.5, 57) };
  return { swing: 1 - easeIn(lin(frame, 62.5, 66)), chars: 1 - lin(frame, 61, 63.5) };
}

/** Font size for the code: long codes get smaller so the tilted tag never rises into the text. */
export function codeFontSize(context, code) {
  context.font = `700 40px ${FONT}`;
  context.letterSpacing = "0px";
  let width = 0;
  for (const ch of code) width += context.measureText(ch).width + 0.5;
  return width > 290 ? (40 * 290) / width : 40;
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

/** Draws the tag; the context origin is the box region's corner (1160, 20). */
function drawTag(context, frame, code) {
  const s = tagState(frame);
  if (s.swing <= 0.02) return;
  const size = codeFontSize(context, code);
  context.font = `700 ${size}px ${FONT}`;
  context.letterSpacing = "0px";
  const advances = [...code].map((ch) => context.measureText(ch).width + 0.5);
  const codeWidth = advances.reduce((a, b) => a + b, 0);
  context.font = `300 21px ${FONT}`;
  context.letterSpacing = "0.5px";
  const labelWidth = context.measureText("code:").width;
  const w = 14 + Math.max(codeWidth, labelWidth) + 16;
  const h = 74;

  context.save();
  context.translate(58 + w / 2, 187 + h / 2);
  context.rotate((-4 * Math.PI) / 180);
  context.scale(Math.cos((88 * (1 - s.swing) * Math.PI) / 180), 1);
  context.translate(-w / 2, -h / 2);

  context.fillStyle = "#3d1380"; // 3D slab under the tag
  roundRect(context, 0, 6, w, h, 12);
  context.fill();
  const half = ((w + h) * Math.SQRT1_2) / 2;
  const d = Math.SQRT1_2;
  const face = context.createLinearGradient(w / 2 - d * half, h / 2 - d * half, w / 2 + d * half, h / 2 + d * half);
  face.addColorStop(0, "#a865f5");
  face.addColorStop(0.55, "#7b2ff7");
  face.addColorStop(1, "#5f22c8");
  context.fillStyle = face;
  roundRect(context, 0, 0, w, h, 12);
  context.fill();
  context.save();
  roundRect(context, 0, 0, w, h, 12);
  context.clip();
  context.fillStyle = "rgba(255,255,255,.4)"; // top highlight
  context.beginPath();
  context.roundRect(0, 0, w, h, 12);
  context.roundRect(0, 1.5, w, h, 12);
  context.fill("evenodd");
  context.strokeStyle = "rgba(230,194,255,.35)";
  context.lineWidth = 2;
  roundRect(context, 0, 0, w, h, 12);
  context.stroke();
  context.restore();

  // "code:" in a 20px line box at y=6, then the code letter by letter in a 40px line box at y=26.
  context.font = `300 21px ${FONT}`;
  context.letterSpacing = "0.5px";
  context.textBaseline = "alphabetic";
  let m = context.measureText("code:");
  context.globalAlpha = clamp(s.chars * 3);
  context.fillStyle = "#f3e3ff";
  context.fillText("code:", 14, 6 + (20 - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent);
  context.font = `700 ${size}px ${FONT}`;
  context.letterSpacing = "0px";
  m = context.measureText(code);
  const baseline = 26 + (40 - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  let x = 14;
  [...code].forEach((ch, i) => {
    const alpha = clamp(s.chars * (code.length + 3) - i);
    if (alpha > 0) {
      context.globalAlpha = alpha;
      context.fillStyle = "rgba(40,6,80,.5)";
      context.fillText(ch, x, baseline + 2);
      context.fillStyle = "#fff";
      context.fillText(ch, x, baseline);
    }
    x += advances[i];
  });
  context.restore();
}

/** Draws one overlay frame into a canvas the size of AREA, with GIF-style on/off transparency. */
export function drawFrame(context, frame, code, images) {
  const { top, bottom, cols } = META;
  context.clearRect(0, 0, AREA.w, AREA.h);
  context.drawImage(images.top, (frame % cols) * top.w, Math.floor(frame / cols) * top.h, top.w, top.h, top.x - AREA.x, top.y - AREA.y, top.w, top.h);
  context.drawImage(
    images.bottom,
    (frame % cols) * bottom.w,
    Math.floor(frame / cols) * bottom.h,
    bottom.w,
    bottom.h,
    bottom.x - AREA.x,
    bottom.y - AREA.y,
    bottom.w,
    bottom.h,
  );
  drawTag(context, frame, code);
  const image = context.getImageData(0, 0, AREA.w, AREA.h);
  const data = image.data;
  for (let p = 3; p < data.length; p += 4) data[p] = data[p] >= 128 ? 255 : 0;
  context.putImageData(image, 0, 0);
  return image;
}

/** GIF LZW for 8-bit indices: the min-code-size byte, then the data in sub-blocks. */
function lzw(pixels) {
  const out = [];
  let cur = 0;
  let shift = 0;
  let codeSize = 9;
  let next = 258;
  const size = 1 << 20;
  const keys = new Int32Array(size);
  const values = new Int16Array(size);
  const generations = new Uint32Array(size);
  let generation = 1;
  const emit = (code) => {
    cur |= code << shift;
    shift += codeSize;
    while (shift >= 8) {
      out.push(cur & 255);
      cur >>>= 8;
      shift -= 8;
    }
  };
  emit(256);
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i];
    const key = (prefix << 8) | k;
    let h = ((key * 2654435761) >>> 12) & (size - 1);
    while (generations[h] === generation && keys[h] !== key) h = (h + 1) & (size - 1);
    if (generations[h] === generation) {
      prefix = values[h];
      continue;
    }
    emit(prefix);
    if (next === 4096) {
      emit(256);
      next = 258;
      codeSize = 9;
      generation++;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      generations[h] = generation;
      keys[h] = key;
      values[h] = next++;
    }
    prefix = k;
  }
  emit(prefix);
  emit(257);
  if (shift > 0) out.push(cur & 255);
  const blocks = [8];
  for (let i = 0; i < out.length; i += 255) {
    const n = Math.min(255, out.length - i);
    blocks.push(n);
    for (let j = 0; j < n; j++) blocks.push(out[i + j]);
  }
  blocks.push(0);
  return blocks;
}

/** Builds the 10-minute GIF for one code. */
export async function exportGif(code, images, onProgress) {
  const W = AREA.w;
  const H = AREA.h;
  const T = TRANSPARENT;
  const THRESHOLD = 18; // colour changes this small keep what is already on screen
  const TOLERANCE = 3000; // stray dither pixels the name bar may leave behind
  const TOP_ROWS = 400 - AREA.y; // the redrawn box is always exact
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  await document.fonts.load(`700 40px ${FONT}`, code);

  const R = new Int16Array(256);
  const G = new Int16Array(256);
  const B = new Int16Array(256);
  PALETTE.forEach((c, i) => {
    R[i] = c[0];
    G[i] = c[1];
    B[i] = c[2];
  });
  const cache = new Map();
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    let v = cache.get(key);
    if (v !== undefined) return v;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const dr = r - R[i];
      const dg = g - G[i];
      const db = b - B[i];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    cache.set(key, best);
    return best;
  };
  const indexed = (frame) => {
    const data = drawFrame(context, frame, code, images).data;
    const q = new Uint8Array(W * H);
    for (let p = 0, j = 0; p < q.length; p++, j += 4) q[p] = data[j + 3] ? nearest(data[j], data[j + 1], data[j + 2]) : T;
    return q;
  };

  const bytes = [];
  const push = (...values) => {
    for (const v of values) bytes.push(v);
  };
  const u16 = (v) => push(v & 255, (v >> 8) & 255);
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
  push(...ascii("GIF89a"));
  u16(WIDTH);
  u16(HEIGHT);
  push(0xf7, T, 0);
  for (let i = 0; i < 256; i++) push(...(PALETTE[i] ?? PALETTE[0]));
  push(0x21, 0xff, 0x0b, ...ascii("NETSCAPE2.0"), 0x03, 0x01, 0x00, 0x00, 0x00);
  const holdDelay = META.loop_s * 100 - (FRAMES - 1) * META.delay_cs;

  let screen = new Uint8Array(W * H).fill(T);
  let current = indexed(0);
  const counts = new Int32Array(256);
  for (let i = 0; i < FRAMES; i++) {
    const target = current;
    const following = i + 1 < FRAMES ? indexed(i + 1) : null;
    for (let p = 0; p < target.length; p++) {
      const a = target[p];
      const c = screen[p];
      if (a !== c && a !== T && c !== T && Math.abs(R[a] - R[c]) + Math.abs(G[a] - G[c]) + Math.abs(B[a] - B[c]) <= THRESHOLD) target[p] = c;
    }
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    const grow = (x, y) => {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x + 1 > x1) x1 = x + 1;
      if (y + 1 > y1) y1 = y + 1;
    };
    for (let y = 0, p = 0; y < H; y++) for (let x = 0; x < W; x++, p++) if (target[p] !== screen[p]) grow(x, y);
    if (x1 < 0) [x0, y0, x1, y1] = [0, 0, 1, 1];
    let disposal = 1;
    if (following) {
      // Pixels that turn transparent next need this frame cleared afterwards (disposal 2).
      let cx0 = W, cy0 = H, cx1 = -1, cy1 = -1;
      const clearBox = (x, y) => {
        if (x < cx0) cx0 = x;
        if (y < cy0) cy0 = y;
        if (x + 1 > cx1) cx1 = x + 1;
        if (y + 1 > cy1) cy1 = y + 1;
      };
      const strays = [];
      for (let y = 0, p = 0; y < H; y++)
        for (let x = 0; x < W; x++, p++)
          if (following[p] === T && target[p] !== T) {
            if (y < TOP_ROWS) clearBox(x, y);
            else strays.push(p);
          }
      if (strays.length <= (i + 1 === HOLD ? 0 : TOLERANCE)) {
        for (const p of strays) {
          // Keep a stray name-bar pixel, coloured like its neighbours.
          const y = (p / W) | 0;
          const x = p - y * W;
          const seen = [];
          for (let yy = Math.max(y - 3, 0); yy < Math.min(y + 4, H); yy++)
            for (let xx = Math.max(x - 3, 0); xx < Math.min(x + 4, W); xx++) {
              const v = following[yy * W + xx];
              if (v !== T) {
                if (!counts[v]) seen.push(v);
                counts[v]++;
              }
            }
          let best = -1;
          let bestCount = 0;
          for (const v of seen) {
            if (counts[v] > bestCount || (counts[v] === bestCount && v < best)) {
              bestCount = counts[v];
              best = v;
            }
            counts[v] = 0;
          }
          following[p] = best >= 0 ? best : target[p];
        }
      } else {
        for (const p of strays) clearBox(p % W, (p / W) | 0);
      }
      if (cx1 >= 0) {
        x0 = Math.min(x0, cx0);
        y0 = Math.min(y0, cy0);
        x1 = Math.max(x1, cx1);
        y1 = Math.max(y1, cy1);
        disposal = 2;
      }
    } else {
      for (let y = 0, p = 0; y < H; y++) for (let x = 0; x < W; x++, p++) if (target[p] !== T) grow(x, y);
      disposal = 2;
    }
    const w = x1 - x0;
    const h = y1 - y0;
    const sub = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = (y + y0) * W + x + x0;
        sub[y * w + x] = target[p] === screen[p] ? T : target[p];
      }
    push(0x21, 0xf9, 0x04, (disposal << 2) | 1);
    u16(i === HOLD ? holdDelay : META.delay_cs);
    push(T, 0, 0x2c);
    u16(x0 + AREA.x);
    u16(y0 + AREA.y);
    u16(w);
    u16(h);
    push(0);
    const data = lzw(sub);
    for (let k = 0; k < data.length; k++) bytes.push(data[k]);
    screen = target;
    if (disposal === 2) for (let y = y0; y < y1; y++) screen.fill(T, y * W + x0, y * W + x1);
    current = following;
    onProgress((i + 1) / FRAMES);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}
