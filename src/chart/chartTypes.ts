export type PricePoint = {
  ts: number;
  price: number;
};

export type HighPerformanceChartProps = {
  samples: PricePoint[];
  width?: number;
  height?: number;
  className?: string;
  backgroundColor?: [number, number, number, number];
  lineColor?: [number, number, number, number];
  gridColor?: [number, number, number, number];
  maxPoints?: number;
};
