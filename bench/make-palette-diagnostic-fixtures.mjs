// Public synthetic source fixtures for gif-canvas-diagnostic-server.mjs and
// gif-palette-qa-server.mjs. Requires FFmpeg with PNG/BMP/JPEG/libwebp encoders.
//
// node bench/make-palette-diagnostic-fixtures.mjs [--output directory]
//   [--ffmpeg executable] [--profile] [--java executable]
//
// --profile additionally requires a JDK 11+ source-file launcher. Its managed
// JPEG and paired PNG references come from Java ICC color management, not
// FFmpeg. PNG profile controls have a separate profile/manifest.json; JPEG/ICC
// references are useful comparisons, not universal browser byte goldens.
// Output must be new or empty. Existing paths are never deleted or overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';

const options = { output: '.tmp/palette-diagnostic-fixtures', ffmpeg: process.env.FFMPEG_BIN || process.env.FFMPEG || 'ffmpeg',
  java: process.env.JAVA_BIN || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java'), profile: false };
const usage = 'Usage: node bench/make-palette-diagnostic-fixtures.mjs [--output directory] [--ffmpeg executable] [--profile] [--java executable]';
for (let i = 2; i < process.argv.length; i++) {
  const argument = process.argv[i];
  if (argument === '--profile') options.profile = true;
  else if (['--output', '--ffmpeg', '--java'].includes(argument) && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) options[argument.slice(2)] = process.argv[++i];
  else if (argument === '--help') { console.log(usage); process.exit(0); }
  else throw new Error(usage);
}
const directory = path.resolve(options.output);
if (fs.existsSync(directory) && (!fs.statSync(directory).isDirectory() || fs.readdirSync(directory).length)) throw new Error('Choose a new or empty output directory: ' + directory);
function run(executable, args) {
  const result = spawnSync(executable, args, { maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  if (result.error) throw new Error(`Could not run ${executable}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${executable} failed (${result.status}): ${result.stderr.toString().trim()}`);
  return result.stdout;
}
const ffmpeg = args => run(options.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-threads', '1', ...args]);
const ffmpegVersion = run(options.ffmpeg, ['-version']).toString().split(/\r?\n/)[0];
if (options.profile) run(options.java, ['-version']);
fs.mkdirSync(directory, { recursive: true });
const write = (name, bytes) => fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx' });
const manifest = [];
function visibleColors(bytes) {
  const colors = new Set();
  for (let p = 0; p < bytes.length; p += 4) if (bytes[p + 3]) colors.add(bytes[p] << 16 | bytes[p + 1] << 8 | bytes[p + 2]);
  return colors.size;
}
function decode(name) {
  // PAM supplies decoded dimensions as well as RGBA bytes. A byte-length-only
  // check cannot distinguish swapped EXIF display dimensions.
  const pam = ffmpeg(['-i', path.join(directory, name), '-frames:v', '1', '-c:v', 'pam', '-pix_fmt', 'rgba', '-f', 'image2pipe', 'pipe:1']);
  const marker = Buffer.from('ENDHDR\n'), headerEnd = pam.indexOf(marker);
  assert.ok(headerEnd >= 0, 'Missing PAM header for ' + name);
  const header = pam.subarray(0, headerEnd).toString('ascii');
  const width = Number(header.match(/^WIDTH (\d+)$/m)?.[1]), height = Number(header.match(/^HEIGHT (\d+)$/m)?.[1]);
  assert.match(header, /^P7\n/); assert.match(header, /^DEPTH 4$/m); assert.match(header, /^MAXVAL 255$/m);
  const data = pam.subarray(headerEnd + marker.length);
  assert.equal(data.length, width * height * 4, 'Independent decoded RGBA size for ' + name);
  return { width, height, data };
}
function reference(entry) {
  const decoded = decode(entry.file);
  assert.equal(decoded.width, entry.width, 'Independent display width for ' + entry.file);
  assert.equal(decoded.height, entry.height, 'Independent display height for ' + entry.file);
  const rgbaFile = entry.file + '.decoded.rgba'; write(rgbaFile, decoded.data);
  if (entry.exactSource) {
    const source = fs.readFileSync(path.join(directory, entry.sourceRgbaFile));
    for (let p = 0; p < source.length; p += 4) {
      assert.equal(decoded.data[p + 3], source[p + 3], 'Lossless alpha for ' + entry.file);
      if (source[p + 3]) for (let c = 0; c < 3; c++) assert.equal(decoded.data[p + c], source[p + c], 'Lossless visible RGB for ' + entry.file);
    }
  }
  manifest.push({ ...entry, rgbaFile, referenceVisibleColors: visibleColors(decoded.data),
    referenceNote: entry.type === 'image/jpeg' ? 'Independent FFmpeg RGBA decode; JPEG/color pipelines may legitimately differ across browsers.' : 'Independent FFmpeg RGBA decode; lossless visible RGB and alpha verified against generated bytes.' });
  return decoded.data;
}
function encode(rawFile, file, width, height, args = []) {
  ffmpeg(['-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${width}x${height}`, '-i', path.join(directory, rawFile), '-frames:v', '1', ...args, path.join(directory, file)]);
}

// These new PNGs are constructed independently of the production encoder. Five
// row filters and odd-width packed indices exercise more than RGBA/filter-zero.
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
  return value >>> 0;
});
function chunk(type, bytes = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii'), output = Buffer.alloc(bytes.length + 12);
  output.writeUInt32BE(bytes.length, 0); name.copy(output, 4); bytes.copy(output, 8);
  let crc = 0xffffffff;
  for (const value of output.subarray(4, output.length - 4)) crc = crcTable[(crc ^ value) & 255] ^ crc >>> 8;
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0, output.length - 4);
  return output;
}
function filteredRows(bytes, stride, height, bpp) {
  const output = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const filter = y % 5, start = y * stride, target = y * (stride + 1);
    output[target] = filter;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? bytes[start + x - bpp] : 0, up = y ? bytes[start + x - stride] : 0;
      const corner = y && x >= bpp ? bytes[start + x - stride - bpp] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - corner, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - corner);
        predictor = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      output[target + x + 1] = (bytes[start + x] - predictor) & 255;
    }
  }
  return output;
}
function png(width, height, depth, colorType, bytes, metadata) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = depth; header[9] = colorType;
  const stride = Math.ceil(width * (colorType === 6 ? 4 : 1) * depth / 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), ...metadata,
    chunk('IDAT', deflateSync(filteredRows(bytes, stride, height, colorType === 6 ? 4 : 1))), chunk('IEND')]);
}

const width = 128, height = 128, palette = [0x4c382b, 0x513524, 0xb5834c, 0xc28c50, 0xe4b8aa, 0xc48846, 0xddccb3, 0xe2c9a8,
  0x3f9abe, 0x91bfcb, 0xe3eaed, 0x5a3f2c, 0x254c61, 0x3b2a1f, 0x2b6179, 0xccb498];
for (const partial of [false, true]) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4, color = palette[(Math.floor(x / 16) + Math.floor(y / 16)) % palette.length];
    rgba[p] = color >>> 16; rgba[p + 1] = color >>> 8; rgba[p + 2] = color;
    rgba[p + 3] = partial ? [0, 1, 2, 64, 127, 128, 254, 255][Math.floor(y / 16)] : 255;
  }
  write(partial ? 'partial.rgba' : 'opaque.rgba', rgba);
}
for (const [file, type, rawFile, args, exactSource] of [
  ['opaque.png', 'image/png', 'opaque.rgba', [], true],
  ['opaque.bmp', 'image/bmp', 'opaque.rgba', ['-pix_fmt', 'bgr24'], true],
  ['opaque.webp', 'image/webp', 'opaque.rgba', ['-c:v', 'libwebp', '-lossless', '1'], true],
  ['opaque.jpg', 'image/jpeg', 'opaque.rgba', ['-q:v', '2', '-pix_fmt', 'yuvj444p'], false],
  ['partial.png', 'image/png', 'partial.rgba', [], true],
  ['partial.webp', 'image/webp', 'partial.rgba', ['-c:v', 'libwebp', '-lossless', '1'], true],
]) {
  encode(rawFile, file, width, height, args);
  reference({ file, type, width, height, exactSource, sourceRgbaFile: rawFile });
}

const gradientWidth = 96, gradientHeight = 64, gradient = Buffer.alloc(gradientWidth * gradientHeight * 4);
for (let y = 0; y < gradientHeight; y++) for (let x = 0; x < gradientWidth; x++) {
  const p = (y * gradientWidth + x) * 4;
  gradient[p] = Math.round(x * 255 / (gradientWidth - 1)); gradient[p + 1] = Math.round(y * 255 / (gradientHeight - 1));
  gradient[p + 2] = (x * 13 + y * 7 + (x > gradientWidth / 3 ? 51 : 0)) & 255; gradient[p + 3] = 255;
}
write('gradient.rgba', gradient);
let baseGradient;
for (const format of ['yuvj444p', 'yuvj420p']) {
  const file = `gradient-${format}.jpg`;
  encode('gradient.rgba', file, gradientWidth, gradientHeight, ['-q:v', '2', '-pix_fmt', format]);
  const data = reference({ file, type: 'image/jpeg', width: gradientWidth, height: gradientHeight, exactSource: false, sourceRgbaFile: 'gradient.rgba' });
  if (format === 'yuvj444p') baseGradient = data;
}
function withExif(jpeg, orientation) {
  const exif = Buffer.alloc(32);
  exif.write('Exif\0\0', 0, 'binary'); exif.write('II', 6); exif.writeUInt16LE(42, 8); exif.writeUInt32LE(8, 10);
  exif.writeUInt16LE(1, 14); exif.writeUInt16LE(0x0112, 16); exif.writeUInt16LE(3, 18); exif.writeUInt32LE(1, 20); exif.writeUInt16LE(orientation, 24);
  const marker = Buffer.from([0xff, 0xe1, 0, 0]); marker.writeUInt16BE(exif.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, exif, jpeg.subarray(2)]);
}
function addExifSet(prefix, jpeg, base, width, height) {
  for (const orientation of [2, 3, 4, 5, 6, 7, 8]) {
    const file = `${prefix}-exif-${orientation}.jpg`, turned = orientation >= 5;
    write(file, withExif(jpeg, orientation));
    const entry = { file, type: 'image/jpeg', width: turned ? height : width, height: turned ? width : height, exactSource: false, exifOrientation: orientation };
    const data = reference(entry);
    // Independently validate FFmpeg's presented bytes against TIFF orientation
    // coordinate rules. Rotation/flip must also preserve the RGB union count.
    for (let y = 0; y < entry.height; y++) for (let x = 0; x < entry.width; x++) {
      const sx = orientation === 2 || orientation === 3 ? width - 1 - x : orientation === 5 || orientation === 6 ? y : orientation === 7 || orientation === 8 ? width - 1 - y : x;
      const sy = orientation === 3 || orientation === 4 ? height - 1 - y : orientation === 6 || orientation === 7 ? height - 1 - x : orientation === 5 || orientation === 8 ? x : y;
      const source = (sy * width + sx) * 4, output = (y * entry.width + x) * 4;
      for (let c = 0; c < 4; c++) assert.equal(data[output + c], base[source + c], 'EXIF presentation bytes for ' + file);
    }
    assert.equal(visibleColors(data), visibleColors(base), 'EXIF RGB union for ' + file);
  }
}
const jpeg = fs.readFileSync(path.join(directory, 'gradient-yuvj444p.jpg'));
// Low-color EXIF controls support full production Auto/Save position checks;
// gradients independently expose nonsquare dimensions and many distinct pixels.
addExifSet('opaque', fs.readFileSync(path.join(directory, 'opaque.jpg')), fs.readFileSync(path.join(directory, 'opaque.jpg.decoded.rgba')), width, height);
addExifSet('gradient', jpeg, baseGradient, gradientWidth, gradientHeight);

// Every alpha byte occurs with every one of sixteen source RGBs. Low alpha
// exposes destructive premultiplication even when a decoder preserves alpha.
const alphaWidth = 256, alphaHeight = palette.length, alphaGrid = Buffer.alloc(alphaWidth * alphaHeight * 4);
for (let y = 0; y < alphaHeight; y++) for (let x = 0; x < alphaWidth; x++) {
  const p = (y * alphaWidth + x) * 4, color = palette[y];
  alphaGrid[p] = color >>> 16; alphaGrid[p + 1] = color >>> 8; alphaGrid[p + 2] = color; alphaGrid[p + 3] = x;
}
write('alpha-grid.rgba', alphaGrid);
write('alpha-grid.png', png(alphaWidth, alphaHeight, 8, 6, alphaGrid, [chunk('sRGB', Buffer.from([0]))]));
encode('alpha-grid.rgba', 'alpha-grid.webp', alphaWidth, alphaHeight, ['-c:v', 'libwebp', '-lossless', '1']);

const indexedWidth = 37, indexedHeight = 29, indexedStride = Math.ceil(indexedWidth / 2);
const indexed = Buffer.alloc(indexedStride * indexedHeight), indexedRgba = Buffer.alloc(indexedWidth * indexedHeight * 4);
const plte = Buffer.alloc(palette.length * 3), transparency = Buffer.from(Array.from({ length: palette.length }, (_, i) => [0, 1, 2, 64, 127, 128, 254, 255][i % 8]));
for (let i = 0; i < palette.length; i++) { plte[i * 3] = palette[i] >>> 16; plte[i * 3 + 1] = palette[i] >>> 8; plte[i * 3 + 2] = palette[i]; }
for (let y = 0; y < indexedHeight; y++) for (let x = 0; x < indexedWidth; x++) {
  const index = (x + y * 3 + Math.floor(x / 7)) % palette.length, p = (y * indexedWidth + x) * 4;
  indexed[y * indexedStride + (x >>> 1)] |= index << (x & 1 ? 0 : 4);
  plte.copy(indexedRgba, p, index * 3, index * 3 + 3); indexedRgba[p + 3] = transparency[index];
}
write('indexed-trns.rgba', indexedRgba);
write('indexed-trns.png', png(indexedWidth, indexedHeight, 4, 3, indexed,
  [chunk('sRGB', Buffer.from([0])), chunk('PLTE', plte), chunk('tRNS', transparency)]));
if (options.profile) {
  const javaSource = fileURLToPath(new URL('./PaletteProfileFixture.java', import.meta.url));
  run(options.java, [javaSource, directory]);
  const profile = fs.readFileSync(path.join(directory, 'linear-rgb.icc')), label = Buffer.from('ICC_PROFILE\0\x01\x01', 'binary');
  const marker = Buffer.from([0xff, 0xe2, 0, 0]);
  assert.ok(profile.length + label.length + 2 <= 65535, 'ICC profile fits one JPEG APP2 segment');
  marker.writeUInt16BE(profile.length + label.length + 2, 2);
  const file = 'gradient-linear-icc.jpg', rgbaFile = file + '.managed.rgba';
  write(file, Buffer.concat([jpeg.subarray(0, 2), marker, label, profile, jpeg.subarray(2)]));
  const managed = fs.readFileSync(path.join(directory, rgbaFile));
  assert.equal(managed.length, gradientWidth * gradientHeight * 4);
  assert.notDeepEqual(managed, baseGradient, 'Embedded linear RGB profile requires a substantial sRGB transform');
  manifest.push({ file, type: 'image/jpeg', width: gradientWidth, height: gradientHeight, exactSource: false, rgbaFile,
    referenceVisibleColors: visibleColors(managed),
    referenceNote: 'Java built-in linear RGB ICC embedded in JPEG; independent Java ICC_ColorSpace.toRGB conversion (JDK color management, normally LCMS) of FFmpeg-decoded JPEG RGB. JPEG/ICC rounding can legitimately differ from browser pipelines.' });

  // Profile controls intentionally stay out of the strict FFmpeg manifest. The
  // transparent/opaque pair has identical encoded RGB and differs only in alpha;
  // Java's managed references likewise differ only in alpha. Thus within-browser
  // pair comparisons isolate premultiplication without demanding cross-CMS bytes.
  const profileDirectory = path.join(directory, 'profile');
  const profileManifest = [];
  for (const opaque of [false, true]) {
    const file = `profile/linear-${opaque ? 'opaque' : 'alpha'}.png`, rgbaFile = file + '.managed.rgba';
    const source = Buffer.from(alphaGrid);
    if (opaque) for (let p = 3; p < source.length; p += 4) source[p] = 255;
    const iccp = Buffer.concat([Buffer.from('Linear RGB\0\0', 'binary'), deflateSync(profile)]);
    write(file, png(alphaWidth, alphaHeight, 8, 6, source, [chunk('iCCP', iccp)]));
    const managed = fs.readFileSync(path.join(directory, rgbaFile));
    assert.equal(managed.length, source.length);
    assert.notDeepEqual(managed, source, 'Linear RGB PNG requires an sRGB transform');
    for (let p = 3; p < source.length; p += 4) assert.equal(managed[p], source[p], 'Managed reference preserves alpha');
    profileManifest.push({ file: path.basename(file), type: 'image/png', width: alphaWidth, height: alphaHeight,
      rgbaFile: path.basename(rgbaFile), exactSource: false, referenceVisibleColors: visibleColors(managed),
      referenceNote: 'Independent Java ICC_ColorSpace.toRGB managed sRGB reference. Browser/CMS rounding can legitimately differ. Paired PNGs have identical encoded RGB and differ only in alpha.' });
  }
  fs.writeFileSync(path.join(profileDirectory, 'manifest.json'), JSON.stringify(profileManifest, null, 2) + '\n', { flag: 'wx' });
}
for (const [file, type, sourceRgbaFile, width, height] of [
  ['alpha-grid.png', 'image/png', 'alpha-grid.rgba', alphaWidth, alphaHeight],
  ['alpha-grid.webp', 'image/webp', 'alpha-grid.rgba', alphaWidth, alphaHeight],
  ['indexed-trns.png', 'image/png', 'indexed-trns.rgba', indexedWidth, indexedHeight],
]) {
  const decoded = reference({ file, type, width, height, exactSource: true, sourceRgbaFile });
  assert.ok(visibleColors(decoded) <= 64, 'Auto/Save control stays below the palette cap');
  const alphas = [...new Set(Array.from({ length: decoded.length / 4 }, (_, i) => decoded[i * 4 + 3]))].sort((a, b) => a - b);
  assert.deepEqual(alphas, file.startsWith('alpha-grid') ? Array.from({ length: 256 }, (_, i) => i) : [0, 1, 2, 64, 127, 128, 254, 255], 'Independent decoded alpha coverage for ' + file);
}
write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
write('provenance.json', JSON.stringify({ generator: 'bench/make-palette-diagnostic-fixtures.mjs', ffmpeg: ffmpegVersion,
  profile: options.profile ? 'Java ICC_ColorSpace.toRGB; independent managed reference, not FFmpeg profile conversion' : false,
  scope: 'Independent decoder comparisons. Lossless visible RGB/alpha are verified. JPEG/profile bytes and color counts are not cross-browser goldens.' }, null, 2) + '\n');
console.log(JSON.stringify({ directory, fixtures: manifest.length, profile: options.profile, files: manifest.map(({ file, width, height, referenceVisibleColors }) => ({ file, width, height, referenceVisibleColors })) }, null, 2));
