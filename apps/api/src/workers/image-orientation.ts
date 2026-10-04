import { MediaProcessError } from "./process";
// Read only the JPEG EXIF IFD0 orientation; every offset stays within APP1.
export function jpegOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos++] !== 0xff) break;
    while (bytes[pos] === 0xff) pos++;
    const marker = bytes[pos++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (pos + 2 > bytes.length) break;
    const length = view.getUint16(pos),
      end = pos + length,
      start = pos + 2;
    if (length < 2 || end > bytes.length) break;
    if (
      marker === 0xe1 &&
      end - start >= 14 &&
      String.fromCharCode(...bytes.subarray(start, start + 6)) === "Exif\0\0"
    ) {
      const base = start + 6,
        little = bytes[base] === 0x49 && bytes[base + 1] === 0x49;
      if (!little && !(bytes[base] === 0x4d && bytes[base + 1] === 0x4d)) break;
      if (view.getUint16(base + 2, little) !== 42) break;
      const offset = view.getUint32(base + 4, little),
        ifd = base + offset;
      if (offset < 8 || ifd + 2 > end) break;
      const count = view.getUint16(ifd, little);
      if (ifd + 2 + count * 12 > end) break;
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (
          view.getUint16(entry, little) === 0x112 &&
          view.getUint16(entry + 2, little) === 3 &&
          view.getUint32(entry + 4, little) === 1
        ) {
          const orientation = view.getUint16(entry + 8, little);
          if (orientation < 1 || orientation > 8)
            throw new MediaProcessError("MEDIA_INVALID_POSTER_ORIENTATION");
          return orientation;
        }
      }
      return 1;
    }
    pos = end;
  }
  return 1;
}
