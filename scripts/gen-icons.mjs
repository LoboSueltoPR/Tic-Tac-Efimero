// Genera icon-192.png e icon-512.png con jimp (pure JS, sin binarios nativos)
// Fondo oscuro + reloj de arena geométrico estilo Oiktubre
import Jimp from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const out = (name) => join(__dir, '../public', name);

// Paleta Oiktubre
const BLACK   = 0x0a0705ff;
const EARTH   = 0x1c1208ff;
const METAL   = 0x3d2e20ff;
const ORANGE  = 0xc95218ff;
const RED     = 0xa81e0aff;
const SAND    = 0xc0280fff;
const CREAM   = 0xf0dfc0ff;

async function makeIcon(size) {
  const img = await Jimp.create(size, size, BLACK);
  const cx = size / 2;
  const s = size / 512; // escala

  // Fondo ligeramente más claro en el centro
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / cx;
      const dy = (y - cx) / cx;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.85) {
        const t = 1 - d / 0.85;
        const r = 10 + Math.round(t * 18);
        const g = 7 + Math.round(t * 8);
        const b = 5 + Math.round(t * 3);
        img.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
      }
    }
  }

  // Función para dibujar rectángulo relleno
  function fillRect(x1, y1, x2, y2, color) {
    for (let y = Math.round(y1); y <= Math.round(y2); y++) {
      for (let x = Math.round(x1); x <= Math.round(x2); x++) {
        if (x >= 0 && x < size && y >= 0 && y < size) {
          img.setPixelColor(color, x, y);
        }
      }
    }
  }

  // Función elipse rellena
  function fillEllipse(cx, cy, rx, ry, color) {
    for (let y = Math.round(cy - ry); y <= Math.round(cy + ry); y++) {
      for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          if (x >= 0 && x < size && y >= 0 && y < size) {
            img.setPixelColor(color, x, y);
          }
        }
      }
    }
  }

  // Función triángulo relleno (simplificado)
  function fillTriangle(x1, y1, x2, y2, x3, y3, color) {
    const minY = Math.round(Math.min(y1, y2, y3));
    const maxY = Math.round(Math.max(y1, y2, y3));
    for (let y = minY; y <= maxY; y++) {
      // Calcular intersecciones con los lados
      const xs = [];
      const pairs = [[x1,y1,x2,y2],[x2,y2,x3,y3],[x3,y3,x1,y1]];
      for (const [ax, ay, bx, by] of pairs) {
        if ((ay <= y && by > y) || (by <= y && ay > y)) {
          xs.push(ax + (y - ay) * (bx - ax) / (by - ay));
        }
      }
      if (xs.length >= 2) {
        xs.sort((a,b)=>a-b);
        for (let x = Math.round(xs[0]); x <= Math.round(xs[xs.length-1]); x++) {
          if (x >= 0 && x < size && y >= 0 && y < size) {
            img.setPixelColor(color, x, y);
          }
        }
      }
    }
  }

  // ---- Tapas metálicas ----
  fillEllipse(cx, 110*s, 88*s, 16*s, METAL);
  fillEllipse(cx, 402*s, 88*s, 16*s, METAL);

  // ---- Pilares ----
  fillRect(168*s, 110*s, 182*s, 402*s, METAL);
  fillRect(330*s, 110*s, 344*s, 402*s, METAL);

  // ---- Nudo central ----
  fillEllipse(cx, cx, 22*s, 9*s, METAL);

  // ---- Bulbo superior: triángulo invertido oscuro ----
  fillTriangle(190*s, 126*s, 322*s, 126*s, cx, 250*s, EARTH);
  // Poca arena arriba
  fillTriangle(220*s, 130*s, 292*s, 130*s, cx, 152*s, RED);

  // ---- Bulbo inferior: triángulo normal lleno de arena ----
  fillTriangle(190*s, 388*s, 322*s, 388*s, cx, 262*s, EARTH);
  // Arena roja — casi todo el bulbo inferior
  fillTriangle(194*s, 384*s, 318*s, 384*s, cx, 268*s, SAND);
  // Montículo de arena
  fillTriangle(236*s, 322*s, 276*s, 322*s, cx, 298*s, 0xd4380fff);

  // ---- Hilo de arena cayendo ----
  for (let y = Math.round(250*s); y <= Math.round(268*s); y++) {
    const x = Math.round(cx);
    for (let dx2 = -1; dx2 <= 1; dx2++) {
      if (x+dx2 >= 0 && x+dx2 < size) img.setPixelColor(SAND, x+dx2, y);
    }
  }

  // ---- Rombo Redondos (esquina inf derecha) ----
  const rd = 22*s;
  const rx = size - 48*s;
  const ry = size - 50*s;
  fillTriangle(rx, ry-rd, rx+rd, ry, rx, ry+rd, ORANGE);
  fillTriangle(rx, ry-rd, rx-rd, ry, rx, ry+rd, RED);

  // ---- Borde naranja sutil ----
  for (let i = 0; i < size; i++) {
    img.setPixelColor(0xc952181a, i, 0);
    img.setPixelColor(0xc952181a, i, size-1);
    img.setPixelColor(0xc952181a, 0, i);
    img.setPixelColor(0xc952181a, size-1, i);
  }

  return img;
}

for (const size of [192, 512]) {
  const img = await makeIcon(size);
  await img.write(out(`icon-${size}.png`));
  console.log(`✓ icon-${size}.png (${size}x${size})`);
}
