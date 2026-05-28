precision mediump float;

uniform vec4 u_color;

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(1280.0, 720.0);

    float scan = 0.94 + 0.06 * sin(gl_FragCoord.y * 0.18);
    float vignette = 1.0 - smoothstep(0.2, 1.3, distance(uv, vec2(0.5, 0.5)));
    float glow = 0.9 + 0.1 * sin((uv.x + uv.y) * 24.0);

    vec3 color = u_color.rgb * scan * glow;
    color += u_color.rgb * 0.12 * vignette;

    gl_FragColor = vec4(color, u_color.a);
}
