import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { normalizeRelativePath } from './paths.mjs';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

export async function writeZip({ outputPath, entries, maxEntries = 1000, date = new Date(), exclusive = false }) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('ZIP_ENTRIES_REQUIRED');
  if (entries.length > maxEntries) throw new Error(`ZIP_ENTRY_LIMIT_EXCEEDED:${entries.length}>${maxEntries}`);
  const names = new Set();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime(date);

  for (const entry of entries) {
    const name = normalizeRelativePath(entry.name, 'zip_entry');
    if (names.has(name)) throw new Error(`DUPLICATE_ZIP_ENTRY:${name}`);
    names.add(name);
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data));
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBytes, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.concat([...localParts, central, eocd]), exclusive ? { flag: 'wx' } : undefined);
  return { outputPath, entryCount: entries.length, entries: [...names] };
}

function findEocd(bytes) {
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) !== 0x06054b50) continue;
    const commentLength = bytes.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === bytes.length) return offset;
  }
  throw new Error('ZIP_EOCD_NOT_FOUND_OR_TRAILING_BYTES');
}

export async function readZipEntries(filePath, { maxEntries = 2000, maxTotalBytes = 100_000_000 } = {}) {
  const bytes = await fs.readFile(filePath);
  const eocdOffset = findEocd(bytes);
  const disk = bytes.readUInt16LE(eocdOffset + 4);
  const centralDisk = bytes.readUInt16LE(eocdOffset + 6);
  if (disk !== 0 || centralDisk !== 0) throw new Error('ZIP_MULTIDISK_FORBIDDEN');
  const countOnDisk = bytes.readUInt16LE(eocdOffset + 8);
  const count = bytes.readUInt16LE(eocdOffset + 10);
  if (countOnDisk !== count) throw new Error('ZIP_ENTRY_COUNT_MISMATCH');
  const centralSize = bytes.readUInt32LE(eocdOffset + 12);
  const centralOffset = bytes.readUInt32LE(eocdOffset + 16);
  if (count > maxEntries) throw new Error(`ZIP_ENTRY_LIMIT_EXCEEDED:${count}>${maxEntries}`);
  if ([count, centralSize, centralOffset].includes(0xffff) || [centralSize, centralOffset].includes(0xffffffff)) throw new Error('ZIP64_UNSUPPORTED');
  if (centralOffset + centralSize !== eocdOffset) throw new Error('ZIP_CENTRAL_DIRECTORY_BOUNDARY_MISMATCH');

  const entries = [];
  const names = new Set();
  const localRanges = [];
  let cursor = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > centralOffset + centralSize) throw new Error(`ZIP_CENTRAL_HEADER_OUT_OF_RANGE:${index}`);
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error(`ZIP_CENTRAL_HEADER_INVALID:${index}`);
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const expectedCrc = bytes.readUInt32LE(cursor + 16);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    if (cursor + 46 + nameLength + extraLength + commentLength > centralOffset + centralSize) throw new Error(`ZIP_CENTRAL_ENTRY_OUT_OF_RANGE:${index}`);
    if (flags & 0x0001) throw new Error('ZIP_ENCRYPTION_FORBIDDEN');
    if ((flags & ~0x0800) !== 0) throw new Error(`ZIP_FLAGS_UNSUPPORTED:${flags}`);
    if (![0, 8].includes(method)) throw new Error(`ZIP_METHOD_UNSUPPORTED:${method}`);
    if ([compressedSize, uncompressedSize, localOffset].includes(0xffffffff)) throw new Error('ZIP64_UNSUPPORTED');
    const name = normalizeRelativePath(bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'), 'zip_entry');
    if (names.has(name)) throw new Error(`DUPLICATE_ZIP_ENTRY:${name}`);
    names.add(name);
    if (localOffset + 30 > centralOffset) throw new Error(`ZIP_LOCAL_HEADER_OUT_OF_RANGE:${name}`);
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`ZIP_LOCAL_HEADER_INVALID:${name}`);
    const localFlags = bytes.readUInt16LE(localOffset + 6);
    const localMethod = bytes.readUInt16LE(localOffset + 8);
    const localCrc = bytes.readUInt32LE(localOffset + 14);
    const localCompressedSize = bytes.readUInt32LE(localOffset + 18);
    const localUncompressedSize = bytes.readUInt32LE(localOffset + 22);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const localName = bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString('utf8');
    if (localName !== name) throw new Error(`ZIP_LOCAL_CENTRAL_NAME_MISMATCH:${name}:${localName}`);
    if (localFlags !== flags || localMethod !== method || localCrc !== expectedCrc || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize) {
      throw new Error(`ZIP_LOCAL_CENTRAL_METADATA_MISMATCH:${name}`);
    }
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > centralOffset) throw new Error(`ZIP_LOCAL_DATA_OVERLAPS_CENTRAL_DIRECTORY:${name}`);
    if (uncompressedSize > maxTotalBytes || totalBytes + uncompressedSize > maxTotalBytes) throw new Error(`ZIP_TOTAL_BYTES_EXCEEDED_DECLARED:${totalBytes + uncompressedSize}>${maxTotalBytes}`);
    for (const range of localRanges) if (localOffset < range.end && dataEnd > range.start) throw new Error(`ZIP_LOCAL_REGION_OVERLAP:${name}:${range.name}`);
    localRanges.push({ name, start: localOffset, end: dataEnd });
    const compressed = bytes.subarray(dataStart, dataEnd);
    if (compressed.length !== compressedSize) throw new Error(`ZIP_DATA_OUT_OF_RANGE:${name}`);
    const data = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed, { maxOutputLength: uncompressedSize + 1 });
    if (data.length !== uncompressedSize) throw new Error(`ZIP_SIZE_MISMATCH:${name}`);
    if (crc32(data) !== expectedCrc) throw new Error(`ZIP_CRC_MISMATCH:${name}`);
    totalBytes += data.length;
    if (totalBytes > maxTotalBytes) throw new Error(`ZIP_TOTAL_BYTES_EXCEEDED:${totalBytes}>${maxTotalBytes}`);
    entries.push({ name, data, compressedSize, uncompressedSize, method });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== centralOffset + centralSize) throw new Error(`ZIP_CENTRAL_DIRECTORY_SIZE_MISMATCH:${cursor}:${centralOffset + centralSize}`);
  return entries;
}
