export type PricePoint = {
    ts: number;
    price: number;
};

export type HighPerformanceChartHandle = {
    addSamples: (samples: PricePoint[]) => void;
    replaceAll: (samples: PricePoint[]) => void;
    reset: () => void;
};

export type HighPerformanceChartProps = {
    initialSamples?: PricePoint[];
    width?: number;
    height?: number;
    className?: string;
    backgroundColor?: [number, number, number, number];
    lineColor?: [number, number, number, number];
    gridColor?: [number, number, number, number];
    maxPoints?: number;
};
