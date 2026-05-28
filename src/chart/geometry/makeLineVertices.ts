export function makeLineVertices(samples: number[]): Float32Array {
    const count = samples.length;
    if (count < 2) {
        return new Float32Array(0);
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of samples) {
        min = Math.min(min, s);
        max = Math.max(max, s);
    }

    const spread = Math.max(max - min, 0.00001);
    const out = new Float32Array(count * 2);

    for (let i = 0; i < count; i += 1) {
        const x = (i / (count - 1)) * 2 - 1;
        const normalizedY = (samples[i] - min) / spread;
        const y = normalizedY * 1.8 - 0.9;

        out[i * 2] = x;
        out[i * 2 + 1] = y;
    }

    return out;
}
