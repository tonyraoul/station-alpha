import { useEffect, useRef } from "react";
import { HighPerformanceChart } from "../chart/HighPerformanceChart";
import type { HighPerformanceChartHandle } from "../chart/chartTypes";
import { useFakeTickerStream } from "./useFakeTickerStream";
import "./harness.css";

export function ChartHarnessPage(): JSX.Element {
  const chartRef = useRef<HighPerformanceChartHandle | null>(null);

  const ticker = useFakeTickerStream({
    symbol: "FKT-USD",
    updatesPerSecond: 20,
    maxPoints: 3000,
    seedPrice: 100,
  });

  const trendText =
    ticker.delta >= 0 ? `+${ticker.delta.toFixed(4)}` : ticker.delta.toFixed(4);
  const trendClass = ticker.delta >= 0 ? "trend-up" : "trend-down";

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
            <span>{ticker.latest.toFixed(4)}</span>
            <span className={trendClass}>{trendText}</span>
          </div>
        </header>

        <div className="fake-ticker-toolbar">
          <button
            type="button"
            className="fake-ticker-btn"
            onClick={ticker.start}
          >
            Start
          </button>
          <button
            type="button"
            className="fake-ticker-btn"
            onClick={ticker.stop}
          >
            Stop
          </button>
          <button
            type="button"
            className="fake-ticker-btn"
            onClick={ticker.reset}
          >
            Reset
          </button>

          <label className="fake-ticker-control">
            Volatility
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={ticker.volatility}
              onChange={(e) => ticker.setVolatility(Number(e.target.value))}
            />
            {ticker.volatility.toFixed(1)}
          </label>

          <label className="fake-ticker-control">
            Updates/s
            <input
              type="range"
              min={4}
              max={120}
              step={1}
              value={ticker.updatesPerSecond}
              onChange={(e) =>
                ticker.setUpdatesPerSecond(Number(e.target.value))
              }
            />
            {ticker.updatesPerSecond.toFixed(0)}
          </label>

          <label className="fake-ticker-control">
            Speed
            <input
              type="range"
              min={1}
              max={80000}
              step={1}
              value={ticker.speed}
              onChange={(e) => ticker.setSpeed(Number(e.target.value))}
            />
            {ticker.speed.toFixed(0)} pt/tick
          </label>

          <label className="fake-ticker-control">
            Max samples
            <input
              type="range"
              min={300}
              max={60 * 60 * 24 * 30 * 12}
              step={100}
              value={ticker.maxSamples}
              onChange={(e) => ticker.setMaxSamples(Number(e.target.value))}
            />
            {ticker.maxSamples.toFixed(0)}
          </label>
        </div>

        <div className="fake-ticker-chart-wrap">
          <HighPerformanceChart
            ref={chartRef}
            width={1060}
            height={460}
            className="fake-ticker-canvas"
            maxPoints={ticker.maxSamples}
            backgroundColor={[0.04, 0.07, 0.12, 1]}
            gridColor={[0.15, 0.24, 0.37, 1]}
            lineColor={[0.29, 0.94, 1, 1]}
          />
        </div>

        <footer className="fake-ticker-footer">
          <div className="fake-ticker-panel">
            Samples: {ticker.sampleCount} / {ticker.maxSamples}
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
