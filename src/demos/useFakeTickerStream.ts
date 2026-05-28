import { useEffect, useMemo, useRef, useState } from "react";

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
    sampleCount: number;
    recentPrices: Float32Array;
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
    const [sampleCount, setSampleCount] = useState(1);
    const [recentPrices, setRecentPrices] = useState<Float32Array>(
        () => new Float32Array([seedPrice]),
    );
    const [resetVersion, setResetVersion] = useState(0);
    const [running, setRunning] = useState(true);
    const [maxSamples, setMaxSamples] = useState(maxPoints);
    const [volatility, setVolatility] = useState(0.6);
    const [updatesPerSecondState, setUpdatesPerSecond] = useState(updatesPerSecond);
    const [speed, setSpeed] = useState(1);
    const [latest, setLatest] = useState(seedPrice);
    const [delta, setDelta] = useState(0);
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
            const pointsToEmit = Math.max(1, Math.floor(speed));
            const emitted = new Float32Array(pointsToEmit);

            let beforeLast = latestRef.current;
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
                const rounded = Math.round(next * 10000) / 10000;

                beforeLast = latestRef.current;
                latestRef.current = rounded;
                emitted[i] = rounded;
            }

            setRecentPrices(emitted);
            setLatest(latestRef.current);
            setDelta(Math.round((latestRef.current - beforeLast) * 10000) / 10000);
            setSampleCount((prev) => Math.min(maxSamples, prev + pointsToEmit));
        }, intervalMs);

        return () => window.clearInterval(id);
    }, [running, maxSamples, volatility, speed, updatesPerSecondState]);

    useEffect(() => {
        setSampleCount((prev) => Math.min(prev, maxSamples));
    }, [maxSamples]);

    const api = useMemo<FakeTickerState>(
        () => ({
            symbol,
            sampleCount,
            recentPrices,
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
                setSampleCount(1);
                setRecentPrices(new Float32Array([seedPrice]));
                setLatest(seedPrice);
                setDelta(0);
                setResetVersion((prev) => prev + 1);
            },
            setMaxSamples,
            setVolatility,
            setUpdatesPerSecond,
            setSpeed,
        }),
        [
            symbol,
            sampleCount,
            recentPrices,
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
