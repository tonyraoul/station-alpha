export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to allocate shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error";
    gl.deleteShader(shader);
    throw new Error(error);
  }

  return shader;
}
