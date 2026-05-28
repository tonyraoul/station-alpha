attribute vec2 a_position;

uniform float u_useRawPosition;
uniform float u_sampleCount;
uniform float u_minPrice;
uniform float u_maxPrice;
uniform float u_ringStart;
uniform float u_ringCapacity;

void main() {
    if(u_useRawPosition > 0.5) {
        gl_Position = vec4(a_position, 0.0, 1.0);
        return;
    }

    float count = max(u_sampleCount, 1.0);
    float spread = max(u_maxPrice - u_minPrice, 0.00001);

    float logicalIndex = mod((a_position.x - u_ringStart + u_ringCapacity), max(u_ringCapacity, 1.0));
    float x = (logicalIndex / max(count - 1.0, 1.0)) * 2.0 - 1.0;
    float normalizedY = (a_position.y - u_minPrice) / spread;
    float y = normalizedY * 1.8 - 0.9;

    gl_Position = vec4(x, y, 0.0, 1.0);
}
