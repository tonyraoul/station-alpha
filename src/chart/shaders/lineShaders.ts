export const VERT_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAG_SHADER = `
precision mediump float;
uniform vec4 u_color;
void main() {
  gl_FragColor = u_color;
}
`;
