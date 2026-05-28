import { useEffect, useMemo, useRef, useState } from "react";
import type { PricePoint } from "./chartTypes";

type UseFakeTickerStreamOptions = {
    symbol?: string;
    updatesPerSecond?: number;
    maxPoints?: number;
    seedPrice?: number;
};

export type FakeTickerState = {
    symbol: string;
    samples: PricePoint[];
    latest: number;
    delta: number;
    volatility: number;
    speed: number;
    running: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    setVolatility: (v: number) => void;
    setSpeed: (v: number) => void;
};

export function useFakeTickerStream({
    symbol = "FKT-USD",
    updatesPerSecond = 20,
    maxPoints = 2400,
    seedPrice = 100,
}: UseFakeTickerStreamOptions = {}): FakeTickerState {
    const [samples, setSamples] = useState<PricePoint[]>([
        { ts: Date.now(), price: seedPrice },
    ]);
    const [running, setRunning] = useState(true);
    const [volatility, setVolatility] = useState(0.6);
    const [speed, setSpeed] = useState(1);
    const latestRef = useRef(seedPrice);

    useEffect(() => {
        if (!running) {
            return;
        }

        const intervalMs = Math.max(8, Math.floor(1000 / updatesPerSecond));

        const id = window.setInterval(() => {
            const trend = Math.sin(Date.now() / 5000) * 0.04;
            const noise = (Math.random() - 0.5) * volatility;
            const next = Math.max(0.1, latestRef.current + (trend + noise) * speed);

            latestRef.current = next;

            setSamples((prev) => {
                const point: PricePoint = { ts: Date.now(), price: Number(next.toFixed(4)) };
                const nextSet = [...prev, point];
                if (nextSet.length <= maxPoints) {
                    return nextSet;
                }
                return nextSet.slice(nextSet.length - maxPoints);
            });
        }, intervalMs);

        return () => window.clearInterval(id);
    }, [running, updatesPerSecond, maxPoints, volatility, speed]);

    const latest = samples.length > 0 ? samples[samples.length - 1].price : seedPrice;
    const prev = samples.length > 1 ? samples[samples.length - 2].price : latest;
    const delta = Number((latest - prev).toFixed(4));

    const api = useMemo<FakeTickerState>(() => ({
        symbol,
        samples,
        latest,
        delta,
        volatility,
        speed,
        running,
        start: () => setRunning(true),
        stop: () => setRunning(false),
        reset: () => {
            latestRef.current = seedPrice;
            setSamples([{ ts: Date.now(), price: seedPrice }]);
        },
        setVolatility,
        setSpeed,
    }), [symbol, samples, latest, delta, volatility, speed, running, seedPrice]);

    return api;
}
