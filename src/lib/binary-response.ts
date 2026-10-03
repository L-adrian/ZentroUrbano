// Views a MySQL Buffer as a response body without copying it; copies doubled memory for large BLOBs.
export function bufferBody(data: Buffer) {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as Uint8Array<ArrayBuffer>;
}
