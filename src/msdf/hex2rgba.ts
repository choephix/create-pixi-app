export function hex2rgba(
  hex: number,
  out: Array<number> | Float32Array = []
): Array<number> | Float32Array {
  out[0] = ((hex >> 16) & 0xff) / 255;
  out[1] = ((hex >> 8) & 0xff) / 255;
  out[2] = (hex & 0xff) / 255;
  out[3] = 255;

  return out;
}
