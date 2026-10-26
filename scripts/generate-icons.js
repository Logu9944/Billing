const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate FinBilling icon graphics
function renderIconPixel(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background Gradient (Deep Navy to Slate Blue)
  const bgR = Math.round(16 + (23 - 16) * ny);
  const bgG = Math.round(42 + (59 - 42) * ny);
  const bgB = Math.round(67 + (99 - 67) * ny);

  // Rounded corners if not maskable
  let alpha = 255;
  if (!isMaskable) {
    const r = w * 0.22;
    const dx = Math.min(x, w - 1 - x);
    const dy = Math.min(y, h - 1 - y);
    if (dx < r && dy < r) {
      const dist = Math.sqrt((r - dx) * (r - dx) + (r - dy) * (r - dy));
      if (dist > r) {
        if (dist > r + 1) return [0, 0, 0, 0];
        alpha = Math.round(255 * (1 - (dist - r)));
      }
    }
  }

  // Golden / Cyan FinBilling "L" Symbol
  // Center is (w*0.5, h*0.48)
  const cx = w * 0.5;
  const cy = h * 0.46;
  const scale = w / 512;

  // Check if pixel falls inside the stylized "L"
  // Vertical stem: x in [180*scale, 230*scale], y in [140*scale, 360*scale]
  // Horizontal foot: x in [180*scale, 350*scale], y in [310*scale, 360*scale]
  const insideVStem = (x >= cx - 75 * scale && x <= cx - 25 * scale && y >= cy - 100 * scale && y <= cy + 100 * scale);
  const insideHFoot = (x >= cx - 75 * scale && x <= cx + 85 * scale && y >= cy + 50 * scale && y <= cy + 100 * scale);

  // Arrow upper-right
  const insideArrowBar = (x >= cx + 25 * scale && x <= cx + 90 * scale && y >= cy - 90 * scale && y <= cy - 50 * scale);
  const insideArrowStem = (x >= cx + 50 * scale && x <= cx + 90 * scale && y >= cy - 90 * scale && y <= cy - 25 * scale);
  const insideDiag = Math.abs((x - (cx - 10 * scale)) - (y - (cy + 20 * scale))) < 18 * scale && (x >= cx - 10 * scale && x <= cx + 70 * scale);

  if (insideVStem || insideHFoot || insideArrowBar || insideArrowStem || insideDiag) {
    // Sky blue (56, 189, 248) to Gold (244, 197, 66) gradient
    const t = (x + y) / (w * 1.5);
    const symR = Math.round(56 + (244 - 56) * t);
    const symG = Math.round(189 + (197 - 189) * t);
    const symB = Math.round(248 + (66 - 248) * t);
    return [symR, symG, symB, alpha];
  }

  // Outer border glow
  const borderDist = Math.min(x, w - 1 - x, y, h - 1 - y);
  if (!isMaskable && borderDist <= 3 * scale && alpha > 0) {
    return [56, 189, 248, Math.min(alpha, 120)];
  }

  return [bgR, bgG, bgB, alpha];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
const sizes = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-32.png', size: 32, maskable: false }
];

for (const target of sizes) {
  const buf = createPng(target.size, target.size, (x, y, w, h) => renderIconPixel(x, y, w, h, target.maskable));
  const dest = path.join(iconsDir, target.name);
  fs.writeFileSync(dest, buf);
  console.log(`Generated ${target.name} (${target.size}x${target.size}) -> ${buf.length} bytes`);
}
console.log('All PWA icons generated successfully!');
