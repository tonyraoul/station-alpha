export function makeLineInput(samples: number[]): Float32Array {
    const count = samples.length;
    if (count < 2) {
        return new Float32Array(0);
    }

    const out = new Float32Array(count * 2);

    for (let i = 0; i < count; i += 1) {
        out[i * 2] = i;
        out[i * 2 + 1] = samples[i];
    }

    return out;
}
