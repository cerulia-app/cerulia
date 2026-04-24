#!/usr/bin/env node
/**
 * Creates a transparent PNG placeholder at the specified output path.
 *
 * Usage:
 *   node create-placeholder.mjs <output-path> [width] [height]
 *
 * width and height default to 1 if omitted. Specify the intended display
 * resolution so layout behaviour during development matches production.
 *
 * The output path is resolved relative to the current working directory.
 * Parent directories are created automatically.
 * If the file already exists, the script exits without overwriting it.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

const [outputPath, widthArg, heightArg] = process.argv.slice(2)

if (!outputPath) {
  console.error('Usage: node create-placeholder.mjs <output-path> [width] [height]')
  process.exit(1)
}

const width = widthArg !== undefined ? parseInt(widthArg, 10) : 1
const height = heightArg !== undefined ? parseInt(heightArg, 10) : 1

if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
  console.error('Error: width and height must be positive integers')
  process.exit(1)
}

// --- Minimal PNG encoder (no external dependencies) ---

// CRC32 lookup table (IEEE polynomial, used by PNG chunk validation)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0)
  return b
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))])
}

/**
 * Generates a width×height fully-transparent PNG using grayscale+alpha
 * (color type 4, 2 bytes per pixel). All zeros compress extremely well
 * so even large placeholder dimensions produce tiny files.
 */
function makePNG(w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 4 // color type: grayscale+alpha
  // compression=0, filter=0, interlace=0 remain at their zero defaults

  // Each scanline: filter byte (0) followed by w×2 zero bytes (gray=0, alpha=0)
  const raw = Buffer.alloc(h * (1 + w * 2), 0)

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const resolved = resolve(process.cwd(), outputPath)
const dir = dirname(resolved)

if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

if (existsSync(resolved)) {
  console.warn(`Skipped (already exists): ${resolved}`)
  process.exit(0)
}

writeFileSync(resolved, makePNG(width, height))
console.log(`Placeholder created: ${resolved} (${width}×${height}, transparent PNG)`)
