export function makeGridVertices(rows: number, cols: number): Float32Array {
  const verts: number[] = [];

  for (let r = 0; r <= rows; r += 1) {
    const y = -1 + (r / rows) * 2;
    verts.push(-1, y, 1, y);
  }

  for (let c = 0; c <= cols; c += 1) {
    const x = -1 + (c / cols) * 2;
    verts.push(x, -1, x, 1);
  }

  return new Float32Array(verts);
}
