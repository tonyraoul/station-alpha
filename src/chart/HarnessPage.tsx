import React from "react";
import { HighPerformanceChart } from "./HighPerformanceChart";
import { useFakeTickerStream } from "./useFakeTickerStream";
import "./harness.css";

export function ChartHarnessPage(): JSX.Element {
  const ticker = useFakeTickerStream({
    symbol: "FKT-USD",
    updatesPerSecond: 20,
    maxPoints: 3000,
    seedPrice: 100,
  });

  const trendText = ticker.delta >= 0 ? `+${ticker.delta.toFixed(4)}` : ticker.delta.toFixed(4);

  return (
    <div className="fake-ticker-page">
      <section className="fake-ticker-shell">
        <header className="fake-ticker-header">
          <h1 className="fake-ticker-title">Fake Ticker Harness</h1>
          <div className="fake-ticker-meta">
            <span>{ticker.symbol}</span>
            <span>{ticker.latest.toFixed(4)}</span>
            <span>{trendText}</span>
          </div>
        </header>

        <div className="fake-ticker-toolbar">
          <button type="button" className="fake-ticker-btn" onClick={ticker.start}>
            Start
          </button>
          <button type="button" className="fake-ticker-btn" onClick={ticker.stop}>
            Stop
          </button>
          <button type="button" className="fake-ticker-btn" onClick={ticker.reset}>
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
            Speed
            <input
              type="range"
              min={0.4}
              max={2.5}
              step={0.1}
              value={ticker.speed}
              onChange={(e) => ticker.setSpeed(Number(e.target.value))}
            />
            {ticker.speed.toFixed(1)}x
          </label>
        </div>

        <div className="fake-ticker-chart-wrap">
          <HighPerformanceChart
            samples={ticker.samples}
            width={1060}
            height={460}
            className="fake-ticker-canvas"
            maxPoints={2500}
          />
        </div>

        <footer className="fake-ticker-footer">
          <div className="fake-ticker-panel">Samples: {ticker.samples.length}</div>
          <div className="fake-ticker-panel">Engine: React + TypeScript + WebGL</div>
          <div className="fake-ticker-panel">Status: {ticker.running ? "LIVE" : "PAUSED"}</div>
        </footer>
      </section>
    </div>
  );
}
