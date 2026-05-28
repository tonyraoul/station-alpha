import { useEffect, useMemo, useRef, useState } from "react";
import type { PricePoint } from "../chart/chartTypes";

type UseFakeTickerStreamOptions = {
    symbol?: string;
    updatesPerSecond?: number;
    maxPoints?: number;
    seedPrice?: number;
};

function createSeed(symbol: string, seedPrice: number): number {
    let h = 2166136261;
    for (let i = 0; i < symbol.length; i += 1) {
        h ^= symbol.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    h ^= Math.floor(seedPrice * 1000);
    return (h >>> 0) || 1;
}

function createPrng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export type FakeTickerState = {
    symbol: string;
    samples: PricePoint[];
    recentSamples: PricePoint[];
    resetVersion: number;
    maxSamples: number;
    latest: number;
    delta: number;
    volatility: number;
    updatesPerSecond: number;
    speed: number;
    running: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    setMaxSamples: (v: number) => void;
    setVolatility: (v: number) => void;
    setUpdatesPerSecond: (v: number) => void;
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
    const [recentSamples, setRecentSamples] = useState<PricePoint[]>([
        { ts: Date.now(), price: seedPrice },
    ]);
    const [resetVersion, setResetVersion] = useState(0);
    const [running, setRunning] = useState(true);
    const [maxSamples, setMaxSamples] = useState(maxPoints);
    const [volatility, setVolatility] = useState(0.6);
    const [updatesPerSecondState, setUpdatesPerSecond] = useState(updatesPerSecond);
    const [speed, setSpeed] = useState(1);
    const initialSeed = useMemo(() => createSeed(symbol, seedPrice), [symbol, seedPrice]);
    const latestRef = useRef(seedPrice);
    const prngRef = useRef<() => number>(() => 0.5);
    const driftRef = useRef(0);
    const tickRef = useRef(0);

    useEffect(() => {
        prngRef.current = createPrng(initialSeed);
        driftRef.current = 0;
        tickRef.current = 0;
    }, [initialSeed]);

    useEffect(() => {
        if (!running) {
            return;
        }

        const intervalMs = Math.max(8, Math.floor(1000 / updatesPerSecondState));

        const id = window.setInterval(() => {
            setSamples((prev) => {
                const pointsToEmit = Math.max(1, Math.floor(speed));
                const baseTime = Date.now();
                const emitted: PricePoint[] = [];

                for (let i = 0; i < pointsToEmit; i += 1) {
                    const tick = tickRef.current;
                    tickRef.current += 1;

                    const trend =
                        Math.sin(tick / 18) * 0.03 + Math.cos(tick / 90) * 0.015;

                    const randSigned = prngRef.current() * 2 - 1;
                    driftRef.current = driftRef.current * 0.82 + randSigned * 0.18;
                    const micro = (prngRef.current() + prngRef.current() - 1) * 0.2;
                    const noise = (driftRef.current + micro) * volatility * 0.35;

                    const next = Math.max(0.1, latestRef.current + trend + noise);

                    latestRef.current = next;
                    emitted.push({
                        ts: baseTime + i,
                        price: Number(next.toFixed(4)),
                    });
                }

                const nextSet = [...prev, ...emitted];
                setRecentSamples(emitted);
                if (nextSet.length <= maxSamples) {
                    return nextSet;
                }
                return nextSet.slice(nextSet.length - maxSamples);
            });
        }, intervalMs);

        return () => window.clearInterval(id);
    }, [running, maxSamples, volatility, speed, updatesPerSecondState]);

    useEffect(() => {
        setSamples((prev) => {
            if (prev.length <= maxSamples) {
                return prev;
            }
            return prev.slice(prev.length - maxSamples);
        });
    }, [maxSamples]);

    const latest = samples.length > 0 ? samples[samples.length - 1].price : seedPrice;
    const prev = samples.length > 1 ? samples[samples.length - 2].price : latest;
    const delta = Number((latest - prev).toFixed(4));

    const api = useMemo<FakeTickerState>(
        () => ({
            symbol,
            samples,
            recentSamples,
            resetVersion,
            maxSamples,
            latest,
            delta,
            volatility,
            updatesPerSecond: updatesPerSecondState,
            speed,
            running,
            start: () => setRunning(true),
            stop: () => setRunning(false),
            reset: () => {
                latestRef.current = seedPrice;
                prngRef.current = createPrng(initialSeed);
                driftRef.current = 0;
                tickRef.current = 0;
                const seedPoint = { ts: Date.now(), price: seedPrice };
                setSamples([seedPoint]);
                setRecentSamples([seedPoint]);
                setResetVersion((prev) => prev + 1);
            },
            setMaxSamples,
            setVolatility,
            setUpdatesPerSecond,
            setSpeed,
        }),
        [
            symbol,
            samples,
            recentSamples,
            resetVersion,
            maxSamples,
            latest,
            delta,
            volatility,
            updatesPerSecondState,
            speed,
            running,
            seedPrice,
        ],
    );

    return api;
}
