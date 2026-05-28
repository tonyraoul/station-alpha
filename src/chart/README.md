# High Performance Chart (WebGL + React + TypeScript)

## Requirement Summary

This chart module is designed for high-frequency market-style visualization.

1. Render large, continuously updating time-series data efficiently.
2. Use WebGL for GPU-backed drawing.
3. Integrate with React and TypeScript.
4. Support smooth animation.
5. Provide a harness page themed as a fake ticker terminal.

## Design Goals

1. Keep UI logic in React and heavy drawing in WebGL.
2. Maintain a smooth render loop with `requestAnimationFrame`.
3. Handle incoming streaming points (for example 20 updates per second) without DOM-heavy rendering.
4. Keep memory bounded by clipping to a rolling window.

## Files

- `HighPerformanceChart.tsx`: WebGL chart component.
- `useFakeTickerStream.ts`: fake streaming data source for testing.
- `HarnessPage.tsx`: themed harness page for visual and interaction testing.
- `harness.css`: fake ticker visual theme.
- `chartTypes.ts`: shared types.
- `index.ts`: exports.

## Usage

```tsx
import { HighPerformanceChart, ChartHarnessPage } from "./src/chart";
```

Use `ChartHarnessPage` for quick manual testing. It includes start, stop, reset, volatility, and speed controls.

## Notes

1. This module uses plain WebGL (not three.js) to keep rendering overhead low.
2. The harness is intentionally styled like a fake trading terminal to stress visual clarity under fast updates.
3. If integrated into a larger app, mount `ChartHarnessPage` under a route such as `/chart-harness`.
