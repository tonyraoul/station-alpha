import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { HighPerformanceChart } from "../chart/HighPerformanceChart";
import type { HighPerformanceChartHandle } from "../chart/chartTypes";
import { useFakeTickerStream } from "./useFakeTickerStream";
import "./harness.css";

const CHART_BACKGROUND: [number, number, number, number] = [
  0.04, 0.07, 0.12, 1,
];
const CHART_GRID: [number, number, number, number] = [0.15, 0.24, 0.37, 1];
const CHART_LINE: [number, number, number, number] = [0.29, 0.94, 1, 1];

type TickerControlsProps = {
  running: boolean;
  volatility: number;
  updatesPerSecond: number;
  speed: number;
  maxSamples: number;
  isPending: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onVolatilityChange: (value: number) => void;
  onUpdatesPerSecondChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onMaxSamplesChange: (value: number) => void;
};

const TickerControls = memo(function TickerControls({
  running,
  volatility,
  updatesPerSecond,
  speed,
  maxSamples,
  isPending,
  onStart,
  onStop,
  onReset,
  onVolatilityChange,
  onUpdatesPerSecondChange,
  onSpeedChange,
  onMaxSamplesChange,
}: TickerControlsProps): JSX.Element {
  return (
    <div className="fake-ticker-toolbar">
      <button
        type="button"
        className="fake-ticker-btn"
        onClick={onStart}
        disabled={running}
      >
        Start
      </button>
      <button
        type="button"
        className="fake-ticker-btn"
        onClick={onStop}
        disabled={!running}
      >
        Stop
      </button>
      <button type="button" className="fake-ticker-btn" onClick={onReset}>
        Reset
      </button>

      <label className="fake-ticker-control">
        Volatility
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={volatility}
          onChange={(e) => onVolatilityChange(Number(e.target.value))}
        />
        {volatility.toFixed(1)}
      </label>

      <label className="fake-ticker-control">
        Updates/s
        <input
          type="range"
          min={4}
          max={120}
          step={1}
          value={updatesPerSecond}
          onChange={(e) => onUpdatesPerSecondChange(Number(e.target.value))}
        />
        {updatesPerSecond.toFixed(0)}
      </label>

      <label className="fake-ticker-control">
        Speed
        <input
          type="range"
          min={1}
          max={80000}
          step={1}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        />
        {speed.toFixed(0)} pt/tick
      </label>

      <label className="fake-ticker-control">
        Max samples
        <input
          type="range"
          min={300}
          max={60 * 60 * 24 * 30 * 12}
          step={100}
          value={maxSamples}
          onChange={(e) => onMaxSamplesChange(Number(e.target.value))}
        />
        {maxSamples.toFixed(0)}
        {isPending ? <span className="fake-ticker-pending">syncing</span> : null}
      </label>
    </div>
  );
});

export function ChartHarnessPage(): JSX.Element {
  const chartRef = useRef<HighPerformanceChartHandle | null>(null);
  const [isPending, startTransition] = useTransition();

  const ticker = useFakeTickerStream({
    symbol: "FKT-USD",
    updatesPerSecond: 20,
    maxPoints: 3000,
    seedPrice: 100,
  });

  const deferredLatest = useDeferredValue(ticker.latest);
  const deferredDelta = useDeferredValue(ticker.delta);
  const deferredSampleCount = useDeferredValue(ticker.sampleCount);

  const onMaxSamplesChange = useMemo(
    () => (value: number) => {
      startTransition(() => {
        ticker.setMaxSamples(value);
      });
    },
    [startTransition, ticker.setMaxSamples],
  );

  const { trendText, trendClass } = useMemo(() => {
    const text =
      deferredDelta >= 0
        ? `+${deferredDelta.toFixed(4)}`
        : deferredDelta.toFixed(4);

    return {
      trendText: text,
      trendClass: deferredDelta >= 0 ? "trend-up" : "trend-down",
    };
  }, [deferredDelta]);

  useEffect(() => {
    chartRef.current?.reset();
  }, [ticker.resetVersion]);

  useEffect(() => {
    if (ticker.recentPrices.length === 0) {
      return;
    }

    chartRef.current?.addPrices(ticker.recentPrices);
  }, [ticker.recentPrices]);

  return (
    <div className="fake-ticker-page">
      <section className="fake-ticker-shell">
        <header className="fake-ticker-header">
          <h1 className="fake-ticker-title">Neon Arena Ticker</h1>
          <div className="fake-ticker-meta">
            <span>{ticker.symbol}</span>
            <span>{deferredLatest.toFixed(4)}</span>
            <span className={trendClass}>{trendText}</span>
          </div>
        </header>

        <TickerControls
          running={ticker.running}
          volatility={ticker.volatility}
          updatesPerSecond={ticker.updatesPerSecond}
          speed={ticker.speed}
          maxSamples={ticker.maxSamples}
          isPending={isPending}
          onStart={ticker.start}
          onStop={ticker.stop}
          onReset={ticker.reset}
          onVolatilityChange={ticker.setVolatility}
          onUpdatesPerSecondChange={ticker.setUpdatesPerSecond}
          onSpeedChange={ticker.setSpeed}
          onMaxSamplesChange={onMaxSamplesChange}
        />

        <div className="fake-ticker-chart-wrap">
          <HighPerformanceChart
            ref={chartRef}
            width={1060}
            height={460}
            className="fake-ticker-canvas"
            maxPoints={ticker.maxSamples}
            backgroundColor={CHART_BACKGROUND}
            gridColor={CHART_GRID}
            lineColor={CHART_LINE}
          />
        </div>

        <footer className="fake-ticker-footer">
          <div className="fake-ticker-panel">
            Samples: {deferredSampleCount} / {ticker.maxSamples}
          </div>
          <div className="fake-ticker-panel">
            Engine: React + TypeScript + WebGL
          </div>
          <div className="fake-ticker-panel">
            Status: {ticker.running ? "LIVE" : "PAUSED"}
          </div>
        </footer>
      </section>
    </div>
  );
}
