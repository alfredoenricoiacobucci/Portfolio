/**
 * Fast image dimension reader — reads only file headers (no full decode).
 * Supports JPEG, PNG, WebP, GIF.
 */
const fs = require("fs");

function readImageDimensions(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(30);
    fs.readSync(fd, header, 0, 30, 0);

    // PNG: bytes 16-23 contain width/height as 4-byte big-endian
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      const width = header.readUInt32BE(16);
      const height = header.readUInt32BE(20);
      fs.closeSync(fd);
      return { width, height };
    }

    // GIF: bytes 6-9 contain width/height as 2-byte little-endian
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
      const width = header.readUInt16LE(6);
      const height = header.readUInt16LE(8);
      fs.closeSync(fd);
      return { width, height };
    }

    // WebP: RIFF....WEBP, then VP8 chunk
    if (header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP") {
      // Read more data for WebP parsing
      const buf = Buffer.alloc(64);
      fs.readSync(fd, buf, 0, 64, 0);
      const chunk = buf.toString("ascii", 12, 16);
      if (chunk === "VP8 ") {
        // Lossy: dimensions at offset 26-29
        const width = buf.readUInt16LE(26) & 0x3fff;
        const height = buf.readUInt16LE(28) & 0x3fff;
        fs.closeSync(fd);
        return { width, height };
      }
      if (chunk === "VP8L") {
        // Lossless: 4 bytes at offset 21
        const bits = buf.readUInt32LE(21);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        fs.closeSync(fd);
        return { width, height };
      }
      if (chunk === "VP8X") {
        // Extended: canvas size at offset 24-29
        const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        fs.closeSync(fd);
        return { width, height };
      }
      fs.closeSync(fd);
      return null;
    }

    // JPEG: scan for SOF markers
    if (header[0] === 0xff && header[1] === 0xd8) {
      fs.closeSync(fd);
      return readJpegDimensions(filePath);
    }

    fs.closeSync(fd);
    return null;
  } catch (e) {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
    return null;
  }
}

function readJpegDimensions(filePath) {
  // Read up to 64KB which should cover all headers
  const buf = Buffer.alloc(65536);
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buf, 0, 65536, 0);
    fs.closeSync(fd);

    let offset = 2; // skip SOI
    while (offset < bytesRead - 1) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];

      // SOF markers (baseline, progressive, etc.)
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }

      // Skip this marker segment
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
      } else {
        const len = buf.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    }
    return null;
  } catch (e) {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
    return null;
  }
}

module.exports = { readImageDimensions };
