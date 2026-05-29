import { HashRouter, Route, Routes } from "react-router-dom";
import { LandingPage } from "./landing";
import { ChartHarnessPage } from "./demos";

export function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/harness" element={<ChartHarnessPage />} />
      </Routes>
    </HashRouter>
  );
}
