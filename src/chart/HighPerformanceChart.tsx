import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type {
  HighPerformanceChartHandle,
  HighPerformanceChartProps,
  PricePoint,
} from "./chartTypes";
import { createProgram } from "../gl";
import { makeGridVertices } from "./geometry";
import { FRAG_SHADER, VERT_SHADER } from "./shaders";

type GLResources = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  aPosition: number;
  uColor: WebGLUniformLocation;
  uUseRawPosition: WebGLUniformLocation;
  uSampleCount: WebGLUniformLocation;
  uMinPrice: WebGLUniformLocation;
  uMaxPrice: WebGLUniformLocation;
  uRingStart: WebGLUniformLocation;
  uRingCapacity: WebGLUniformLocation;
  gridVertexCount: number;
  gridBuffer: WebGLBuffer;
  lineBuffer: WebGLBuffer;
};

export const HighPerformanceChart = forwardRef<
  HighPerformanceChartHandle,
  HighPerformanceChartProps
>(function HighPerformanceChart(
  {
    initialSamples,
    width = 920,
    height = 420,
    className,
    backgroundColor = [0.03, 0.05, 0.04, 1],
    lineColor = [0.18, 1, 0.52, 1],
    gridColor = [0.09, 0.24, 0.16, 1],
    maxPoints = 2400,
  },
  ref,
): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<GLResources | null>(null);
  const rafRef = useRef<number | null>(null);
  const drawFrameRef = useRef<(() => void) | null>(null);
  const backgroundColorRef = useRef(backgroundColor);
  const lineColorRef = useRef(lineColor);
  const gridColorRef = useRef(gridColor);

  const lineDataRef = useRef<Float32Array>(new Float32Array(0));
  const lineCapacityRef = useRef(0);
  const lineGpuCapacityRef = useRef(0);
  const lineCountRef = useRef(0);
  const ringStartRef = useRef(0);

  const nextSeqRef = useRef(0);
  const oldestSeqRef = useRef(0);

  const minSeqRef = useRef<number[]>([]);
  const minValRef = useRef<number[]>([]);
  const minFrontRef = useRef(0);
  const maxSeqRef = useRef<number[]>([]);
  const maxValRef = useRef<number[]>([]);
  const maxFrontRef = useRef(0);

  const lineMinRef = useRef(0);
  const lineMaxRef = useRef(1);

  const lineNeedsFullUploadRef = useRef(true);
  const dirtyRange1StartRef = useRef(-1);
  const dirtyRange1EndRef = useRef(-1);
  const dirtyRange2StartRef = useRef(-1);
  const dirtyRange2EndRef = useRef(-1);

  function requestRender(): void {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawFrameRef.current?.();
    });
  }

  useEffect(() => {
    backgroundColorRef.current = backgroundColor;
    lineColorRef.current = lineColor;
    gridColorRef.current = gridColor;
    requestRender();
  }, [backgroundColor, lineColor, gridColor]);

  function resetDirtyRanges(): void {
    dirtyRange1StartRef.current = -1;
    dirtyRange1EndRef.current = -1;
    dirtyRange2StartRef.current = -1;
    dirtyRange2EndRef.current = -1;
  }

  function markFullUpload(): void {
    lineNeedsFullUploadRef.current = true;
    resetDirtyRanges();
  }

  function addDirtyRange(start: number, end: number): void {
    if (start >= end || lineNeedsFullUploadRef.current) {
      return;
    }

    const s = start;
    const e = end;

    if (dirtyRange1StartRef.current === -1) {
      dirtyRange1StartRef.current = s;
      dirtyRange1EndRef.current = e;
      return;
    }

    if (s <= dirtyRange1EndRef.current && e >= dirtyRange1StartRef.current) {
      dirtyRange1StartRef.current = Math.min(dirtyRange1StartRef.current, s);
      dirtyRange1EndRef.current = Math.max(dirtyRange1EndRef.current, e);
      return;
    }

    if (dirtyRange2StartRef.current === -1) {
      dirtyRange2StartRef.current = s;
      dirtyRange2EndRef.current = e;
      return;
    }

    if (s <= dirtyRange2EndRef.current && e >= dirtyRange2StartRef.current) {
      dirtyRange2StartRef.current = Math.min(dirtyRange2StartRef.current, s);
      dirtyRange2EndRef.current = Math.max(dirtyRange2EndRef.current, e);
      return;
    }

    markFullUpload();
  }

  function pushMin(seq: number, value: number): void {
    const seqs = minSeqRef.current;
    const vals = minValRef.current;
    let idx = vals.length - 1;
    while (idx >= minFrontRef.current && vals[idx] >= value) {
      vals.pop();
      seqs.pop();
      idx -= 1;
    }
    vals.push(value);
    seqs.push(seq);
  }

  function pushMax(seq: number, value: number): void {
    const seqs = maxSeqRef.current;
    const vals = maxValRef.current;
    let idx = vals.length - 1;
    while (idx >= maxFrontRef.current && vals[idx] <= value) {
      vals.pop();
      seqs.pop();
      idx -= 1;
    }
    vals.push(value);
    seqs.push(seq);
  }

  function evictOldestFromDeques(oldestSeq: number): void {
    const minSeqs = minSeqRef.current;
    while (
      minFrontRef.current < minSeqs.length &&
      minSeqs[minFrontRef.current] < oldestSeq
    ) {
      minFrontRef.current += 1;
    }

    const maxSeqs = maxSeqRef.current;
    while (
      maxFrontRef.current < maxSeqs.length &&
      maxSeqs[maxFrontRef.current] < oldestSeq
    ) {
      maxFrontRef.current += 1;
    }

    if (minFrontRef.current > 256 && minFrontRef.current * 2 > minSeqs.length) {
      minSeqRef.current = minSeqs.slice(minFrontRef.current);
      minValRef.current = minValRef.current.slice(minFrontRef.current);
      minFrontRef.current = 0;
    }

    if (maxFrontRef.current > 256 && maxFrontRef.current * 2 > maxSeqs.length) {
      maxSeqRef.current = maxSeqs.slice(maxFrontRef.current);
      maxValRef.current = maxValRef.current.slice(maxFrontRef.current);
      maxFrontRef.current = 0;
    }
  }

  function refreshExtremaFromDeques(): void {
    if (lineCountRef.current === 0) {
      lineMinRef.current = 0;
      lineMaxRef.current = 1;
      return;
    }

    lineMinRef.current = minValRef.current[minFrontRef.current];
    lineMaxRef.current = maxValRef.current[maxFrontRef.current];
  }

  function initLineCapacity(capacity: number): void {
    const cap = Math.max(1, capacity);
    const data = new Float32Array((cap + 2) * 2);
    for (let i = 0; i < cap; i += 1) {
      data[i * 2] = i;
    }

    lineDataRef.current = data;
    lineCapacityRef.current = cap;
    lineGpuCapacityRef.current = 0;
    lineCountRef.current = 0;
    ringStartRef.current = 0;
    nextSeqRef.current = 0;
    oldestSeqRef.current = 0;

    minSeqRef.current = [];
    minValRef.current = [];
    minFrontRef.current = 0;
    maxSeqRef.current = [];
    maxValRef.current = [];
    maxFrontRef.current = 0;

    lineMinRef.current = 0;
    lineMaxRef.current = 1;
    markFullUpload();
  }

  function appendOne(value: number): void {
    const cap = lineCapacityRef.current;
    if (cap <= 0) {
      return;
    }

    let count = lineCountRef.current;
    let start = ringStartRef.current;
    let slot: number;

    if (count < cap) {
      slot = (start + count) % cap;
      lineCountRef.current = count + 1;
    } else {
      slot = start;
      start = (start + 1) % cap;
      ringStartRef.current = start;
      oldestSeqRef.current += 1;
    }

    lineDataRef.current[slot * 2 + 1] = value;
    addDirtyRange(slot, slot + 1);

    const seq = nextSeqRef.current;
    nextSeqRef.current += 1;

    pushMin(seq, value);
    pushMax(seq, value);
    evictOldestFromDeques(oldestSeqRef.current);
    refreshExtremaFromDeques();
  }

  function replaceAllValues(values: number[]): void {
    const cap = lineCapacityRef.current;
    const start = Math.max(0, values.length - cap);
    const data = lineDataRef.current;

    lineCountRef.current = 0;
    ringStartRef.current = 0;
    nextSeqRef.current = 0;
    oldestSeqRef.current = 0;
    minSeqRef.current = [];
    minValRef.current = [];
    minFrontRef.current = 0;
    maxSeqRef.current = [];
    maxValRef.current = [];
    maxFrontRef.current = 0;

    for (let i = start; i < values.length; i += 1) {
      const slot = lineCountRef.current;
      const value = values[i];
      data[slot * 2 + 1] = value;

      const seq = nextSeqRef.current;
      nextSeqRef.current += 1;
      pushMin(seq, value);
      pushMax(seq, value);

      lineCountRef.current += 1;
    }

    refreshExtremaFromDeques();
    markFullUpload();
  }

  function resetSeries(): void {
    lineCountRef.current = 0;
    ringStartRef.current = 0;
    nextSeqRef.current = 0;
    oldestSeqRef.current = 0;
    minSeqRef.current = [];
    minValRef.current = [];
    minFrontRef.current = 0;
    maxSeqRef.current = [];
    maxValRef.current = [];
    maxFrontRef.current = 0;
    lineMinRef.current = 0;
    lineMaxRef.current = 1;
    markFullUpload();
  }

  function snapshotValuesInOrder(): number[] {
    const cap = lineCapacityRef.current;
    const count = lineCountRef.current;
    const start = ringStartRef.current;
    const out = new Array<number>(count);

    for (let i = 0; i < count; i += 1) {
      const slot = (start + i) % cap;
      out[i] = lineDataRef.current[slot * 2 + 1];
    }

    return out;
  }

  useEffect(() => {
    const previous = snapshotValuesInOrder();
    initLineCapacity(maxPoints);
    if (previous.length > 0) {
      replaceAllValues(previous);
    }
    requestRender();
  }, [maxPoints]);

  useEffect(() => {
    if (!initialSamples || initialSamples.length === 0) {
      return;
    }

    replaceAllValues(initialSamples.map((p) => p.price));
    requestRender();
  }, [initialSamples]);

  useImperativeHandle(
    ref,
    () => ({
      addSamples: (samplesToAdd: PricePoint[]) => {
        if (samplesToAdd.length === 0) {
          return;
        }

        for (let i = 0; i < samplesToAdd.length; i += 1) {
          appendOne(samplesToAdd[i].price);
        }
        requestRender();
      },
      replaceAll: (allSamples: PricePoint[]) => {
        replaceAllValues(allSamples.map((p) => p.price));
        requestRender();
      },
      reset: () => {
        resetSeries();
        requestRender();
      },
    }),
    [maxPoints],
  );

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
    const uUseRawPosition = gl.getUniformLocation(program, "u_useRawPosition");
    const uSampleCount = gl.getUniformLocation(program, "u_sampleCount");
    const uMinPrice = gl.getUniformLocation(program, "u_minPrice");
    const uMaxPrice = gl.getUniformLocation(program, "u_maxPrice");
    const uRingStart = gl.getUniformLocation(program, "u_ringStart");
    const uRingCapacity = gl.getUniformLocation(program, "u_ringCapacity");

    if (
      aPosition < 0 ||
      !uColor ||
      !uUseRawPosition ||
      !uSampleCount ||
      !uMinPrice ||
      !uMaxPrice ||
      !uRingStart ||
      !uRingCapacity
    ) {
      return;
    }

    const gridBuffer = gl.createBuffer();
    const lineBuffer = gl.createBuffer();
    if (!gridBuffer || !lineBuffer) {
      if (gridBuffer) {
        gl.deleteBuffer(gridBuffer);
      }
      if (lineBuffer) {
        gl.deleteBuffer(lineBuffer);
      }
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    const grid = makeGridVertices(6, 8);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      (lineCapacityRef.current + 2) * 2 * 4,
      gl.DYNAMIC_DRAW,
    );
    lineGpuCapacityRef.current = lineCapacityRef.current;

    glRef.current = {
      gl,
      program,
      aPosition,
      uColor,
      uUseRawPosition,
      uSampleCount,
      uMinPrice,
      uMaxPrice,
      uRingStart,
      uRingCapacity,
      gridVertexCount: grid.length / 2,
      gridBuffer,
      lineBuffer,
    };

    requestRender();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      gl.deleteBuffer(gridBuffer);
      gl.deleteBuffer(lineBuffer);
      gl.deleteProgram(program);
      glRef.current = null;
    };
  }, []);

  useEffect(() => {
    drawFrameRef.current = () => {
      const res = glRef.current;
      if (!res) {
        return;
      }

      const {
        gl,
        program,
        aPosition,
        uColor,
        uUseRawPosition,
        uSampleCount,
        uMinPrice,
        uMaxPrice,
        uRingStart,
        uRingCapacity,
        gridVertexCount,
        gridBuffer,
        lineBuffer,
      } = res;

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      const bg = backgroundColorRef.current;
      const line = lineColorRef.current;
      const gridCol = gridColorRef.current;

      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uUseRawPosition, 1);
      gl.uniform4f(uColor, gridCol[0], gridCol[1], gridCol[2], gridCol[3]);
      gl.drawArrays(gl.LINES, 0, gridVertexCount);

      const count = lineCountRef.current;
      if (count > 0) {
        const cap = lineCapacityRef.current;
        const start = ringStartRef.current;

        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        if (lineGpuCapacityRef.current !== cap) {
          gl.bufferData(gl.ARRAY_BUFFER, (cap + 2) * 2 * 4, gl.DYNAMIC_DRAW);
          lineGpuCapacityRef.current = cap;
          markFullUpload();
        }

        if (lineNeedsFullUploadRef.current) {
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineDataRef.current);
          lineNeedsFullUploadRef.current = false;
          resetDirtyRanges();
        } else {
          if (dirtyRange1StartRef.current >= 0) {
            const s1 = dirtyRange1StartRef.current;
            const e1 = dirtyRange1EndRef.current;
            gl.bufferSubData(
              gl.ARRAY_BUFFER,
              s1 * 2 * 4,
              lineDataRef.current.subarray(s1 * 2, e1 * 2),
            );
          }
          if (dirtyRange2StartRef.current >= 0) {
            const s2 = dirtyRange2StartRef.current;
            const e2 = dirtyRange2EndRef.current;
            gl.bufferSubData(
              gl.ARRAY_BUFFER,
              s2 * 2 * 4,
              lineDataRef.current.subarray(s2 * 2, e2 * 2),
            );
          }
          resetDirtyRanges();
        }

        gl.uniform1f(uUseRawPosition, 0);
        gl.uniform1f(uSampleCount, count);
        gl.uniform1f(uMinPrice, lineMinRef.current);
        gl.uniform1f(uMaxPrice, lineMaxRef.current);
        gl.uniform1f(uRingStart, start);
        gl.uniform1f(uRingCapacity, cap);
        gl.uniform4f(uColor, line[0], line[1], line[2], line[3]);

        const firstCount = Math.min(count, cap - start);
        const secondCount = count - firstCount;

        gl.lineWidth(1.5);
        gl.drawArrays(gl.LINE_STRIP, start, firstCount);
        if (secondCount > 0) {
          gl.drawArrays(gl.LINE_STRIP, 0, secondCount);

          // Upload 2 temporary bridge vertices in reserved tail slots to close the wrap gap.
          const bridgeBase = cap;
          const lastFirstSlot = start + firstCount - 1;
          const firstSecondSlot = 0;

          lineDataRef.current[bridgeBase * 2] =
            lineDataRef.current[lastFirstSlot * 2];
          lineDataRef.current[bridgeBase * 2 + 1] =
            lineDataRef.current[lastFirstSlot * 2 + 1];
          lineDataRef.current[(bridgeBase + 1) * 2] =
            lineDataRef.current[firstSecondSlot * 2];
          lineDataRef.current[(bridgeBase + 1) * 2 + 1] =
            lineDataRef.current[firstSecondSlot * 2 + 1];

          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            bridgeBase * 2 * 4,
            lineDataRef.current.subarray(bridgeBase * 2, (bridgeBase + 2) * 2),
          );
          gl.drawArrays(gl.LINES, bridgeBase, 2);
        }
      }
    };

    // Guarantee at least one render after the draw callback is ready.
    requestRender();

    return () => {
      drawFrameRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
});
