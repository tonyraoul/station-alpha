import { useEffect, useMemo, useRef } from "react";
import type { HighPerformanceChartProps, PricePoint } from "./chartTypes";
import { createProgram, makeGridVertices, makeLineVertices } from "./gl";
import { FRAG_SHADER, VERT_SHADER } from "./shaders";

type GLResources = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  aPosition: number;
  uColor: WebGLUniformLocation;
  buffer: WebGLBuffer;
};

function clampSamples(samples: PricePoint[], maxPoints: number): PricePoint[] {
  if (samples.length <= maxPoints) {
    return samples;
  }
  return samples.slice(samples.length - maxPoints);
}

export function HighPerformanceChart({
  samples,
  width = 920,
  height = 420,
  className,
  backgroundColor = [0.03, 0.05, 0.04, 1],
  lineColor = [0.18, 1, 0.52, 1],
  gridColor = [0.09, 0.24, 0.16, 1],
  maxPoints = 2400,
}: HighPerformanceChartProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<GLResources | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentRef = useRef<number[]>([]);

  const target = useMemo(() => {
    const clipped = clampSamples(samples, maxPoints);
    return clipped.map((p) => p.price);
  }, [samples, maxPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      return;
    }

    const program = createProgram(gl, VERT_SHADER, FRAG_SHADER);
    const aPosition = gl.getAttribLocation(program, "a_position");
    const uColor = gl.getUniformLocation(program, "u_color");

    if (aPosition < 0 || !uColor) {
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      return;
    }

    glRef.current = { gl, program, aPosition, uColor, buffer };

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      glRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (target.length === 0) {
      currentRef.current = [];
      return;
    }

    if (currentRef.current.length !== target.length) {
      currentRef.current = [...target];
      return;
    }

    for (let i = 0; i < target.length; i += 1) {
      const delta = target[i] - currentRef.current[i];
      currentRef.current[i] += delta * 0.25;
    }
  }, [target]);

  useEffect(() => {
    function frame() {
      const res = glRef.current;
      if (!res) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const { gl, program, aPosition, uColor, buffer } = res;

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(
        backgroundColor[0],
        backgroundColor[1],
        backgroundColor[2],
        backgroundColor[3],
      );
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      const grid = makeGridVertices(6, 8);
      gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
      gl.uniform4fv(uColor, new Float32Array(gridColor));
      gl.drawArrays(gl.LINES, 0, grid.length / 2);

      const lineVertices = makeLineVertices(currentRef.current);
      if (lineVertices.length > 0) {
        gl.bufferData(gl.ARRAY_BUFFER, lineVertices, gl.DYNAMIC_DRAW);
        gl.uniform4fv(uColor, new Float32Array(lineColor));
        gl.lineWidth(1.5);
        gl.drawArrays(gl.LINE_STRIP, 0, lineVertices.length / 2);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [backgroundColor, gridColor, lineColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
