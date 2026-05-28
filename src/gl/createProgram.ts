import { compileShader } from "./compileShader";

export function createProgram(
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string,
): WebGLProgram {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    if (!program) {
        throw new Error("Unable to create WebGL program");
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program) ?? "Unknown program link error";
        gl.deleteProgram(program);
        throw new Error(error);
    }

    return program;
}
