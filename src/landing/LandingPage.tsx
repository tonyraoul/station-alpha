import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ReactMarkdown from "react-markdown";
import { HighPerformanceChart } from "../chart/HighPerformanceChart";
import type { HighPerformanceChartHandle } from "../chart/chartTypes";
import { useFakeTickerStream } from "../demos/useFakeTickerStream";
import q1Doc from "../content/question-1-design-doc.md?raw";
import q2Doc from "../content/question-2-design-doc.md?raw";
import consolidatedCalc from "../content/consolidated-multi-resolution-calculation.md?raw";
import consolidatedService from "../content/consolidated-service-interactions.md?raw";
import "./landing.css";

gsap.registerPlugin(ScrollTrigger);

type DocSection = {
  id: string;
  title: string;
  subtitle: string;
  content: string;
};

const CHART_BACKGROUND: [number, number, number, number] = [
  0.02, 0.05, 0.11, 1,
];
const CHART_GRID: [number, number, number, number] = [0.2, 0.3, 0.4, 1];
const CHART_LINE: [number, number, number, number] = [0.06, 0.95, 0.89, 1];
let mermaidRenderCount = 0;
let mermaidInstancePromise: Promise<{
  initialize: (config: object) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}> | null = null;
let mermaidInitialized = false;
let mermaidRenderQueue: Promise<void> = Promise.resolve();

function getMermaid() {
  if (!mermaidInstancePromise) {
    mermaidInstancePromise = import("mermaid").then((mod) => mod.default);
  }

  return mermaidInstancePromise;
}

function MermaidBlock({ chart }: { chart: string }): JSX.Element {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const normalizedChart = chart.trim();
        if (!normalizedChart) {
          throw new Error("Empty mermaid chart source");
        }

        const mermaid = await getMermaid();
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "dark",
            themeVariables: {
              primaryColor: "#0f1d38",
              primaryTextColor: "#dce9ff",
              lineColor: "#6ab7ff",
              tertiaryColor: "#0a1327",
            },
          });
          mermaidInitialized = true;
        }

        const renderId = `mermaid-${mermaidRenderCount}`;
        mermaidRenderCount += 1;

        const timeout = new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Mermaid render timeout"));
          }, 9000);
        });

        const result = await Promise.race([
          mermaid.render(renderId, normalizedChart),
          timeout,
        ]);

        if (!cancelled) {
          setSvg(result.svg);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSvg("");
        }
      }
    };

    mermaidRenderQueue = mermaidRenderQueue
      .then(() => render())
      .catch(() => {
        // Keep the queue alive for subsequent diagrams.
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (failed) {
    return (
      <pre className="mermaid-fallback">
        <code>{chart}</code>
      </pre>
    );
  }

  if (!svg) {
    return <div className="mermaid-loading">Rendering diagram...</div>;
  }

  return (
    <div
      className="mermaid-surface"
      // Mermaid returns trusted SVG markup from local markdown docs.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const DocsDeck = memo(function DocsDeck({
  docs,
}: {
  docs: DocSection[];
}): JSX.Element {
  return (
    <section className="docs-grid">
      {docs.map((doc) => (
        <article key={doc.id} className="doc-card" id={doc.id}>
          <h2>{doc.title}</h2>
          <p className="doc-subtitle">{doc.subtitle}</p>
          <div className="doc-content markdown-surface">
            <ReactMarkdown
              components={{
                code(props) {
                  const { className, children, ...rest } = props;
                  const match = /language-(\w+)/.exec(className ?? "");
                  const language = match?.[1];
                  const source = String(children).replace(/\n$/, "");

                  if (language === "mermaid") {
                    return <MermaidBlock chart={source} />;
                  }

                  return (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {doc.content}
            </ReactMarkdown>
          </div>
        </article>
      ))}
    </section>
  );
});

export function LandingPage(): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const docs = useMemo<DocSection[]>(
    () => [
      {
        id: "q1",
        title: "Question 1 Answer",
        subtitle:
          "Rendering strategy, throughput planning, and system trade-offs",
        content: q1Doc,
      },
      {
        id: "q2",
        title: "Question 2 Answer",
        subtitle: "Trade replay feature with integrity-first architecture",
        content: q2Doc,
      },
      {
        id: "consolidated-calc",
        title: "Consolidation: Multi-Resolution Calculation",
        subtitle: "Rollup math, pipeline behavior, and recovery patterns",
        content: consolidatedCalc,
      },
      {
        id: "consolidated-services",
        title: "Consolidation: Service Interactions",
        subtitle: "Backend and frontend package interaction blueprints",
        content: consolidatedService,
      },
    ],
    [],
  );

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-kicker", {
        opacity: 0,
        y: 28,
        duration: 0.8,
        ease: "power3.out",
      });

      gsap.from(".hero-title-line", {
        opacity: 0,
        y: 55,
        duration: 1,
        stagger: 0.14,
        ease: "power4.out",
      });

      gsap.from(".hero-subtitle", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        delay: 0.35,
        ease: "power3.out",
      });

      gsap.from(".hero-glass", {
        opacity: 0,
        y: 40,
        scale: 0.97,
        duration: 0.95,
        delay: 0.2,
        ease: "power3.out",
      });

      gsap.to(".orb-a", {
        y: -30,
        x: 18,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".orb-b", {
        y: 25,
        x: -22,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.utils.toArray<HTMLElement>(".doc-card").forEach((card, index) => {
        gsap.from(card, {
          opacity: 0,
          y: 90,
          rotateX: 6,
          transformOrigin: "top center",
          duration: 0.95,
          delay: index * 0.04,
          ease: "power4.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            once: true,
          },
        });
      });

      gsap.to(".chart-wrap", {
        yPercent: -7,
        ease: "none",
        scrollTrigger: {
          trigger: ".chart-zone",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <HeroSection />

      <LiveChartSection />

      <DocsDeck docs={docs} />
    </div>
  );
}

const HeroSection = memo(function HeroSection(): JSX.Element {
  return (
    <header className="hero">
      <p className="hero-kicker">Station Alpha • Screening Task</p>
      <h1 className="hero-title">
        <span className="hero-title-line">Realtime Market</span>
        <span className="hero-title-line">Infrastructure</span>
        <span className="hero-title-line">Crafted for Replay</span>
      </h1>
      <p className="hero-subtitle">
        Live WebGL charting, integrity-first replay architecture, and
        multi-resolution data strategy in one cinematic landing page.
      </p>
    </header>
  );
});

const LiveChartSection = memo(function LiveChartSection(): JSX.Element {
  const chartRef = useRef<HighPerformanceChartHandle | null>(null);
  const ticker = useFakeTickerStream({
    symbol: "BTCUSD",
    updatesPerSecond: 24,
    maxPoints: 3600,
    seedPrice: 68420,
  });

  useEffect(() => {
    if (ticker.recentPrices.length === 0) {
      return;
    }

    chartRef.current?.addPrices(ticker.recentPrices);
  }, [ticker.recentPrices]);

  const latestText = useMemo(() => ticker.latest.toFixed(4), [ticker.latest]);
  const deltaText = useMemo(() => {
    const sign = ticker.delta >= 0 ? "+" : "";
    return `${sign}${ticker.delta.toFixed(4)}`;
  }, [ticker.delta]);
  const deltaClass = ticker.delta >= 0 ? "up" : "down";

  return (
    <section className="hero-glass chart-zone">
      <div className="chart-meta">
        <div>
          <p className="meta-label">Symbol</p>
          <p className="meta-value">{ticker.symbol}</p>
        </div>
        <div>
          <p className="meta-label">Latest</p>
          <p className="meta-value">{latestText}</p>
        </div>
        <div>
          <p className="meta-label">Delta</p>
          <p className={`meta-value ${deltaClass}`}>{deltaText}</p>
        </div>
        <div>
          <p className="meta-label">Window</p>
          <p className="meta-value">{ticker.sampleCount} ticks</p>
        </div>
      </div>
      <div className="chart-wrap">
        <HighPerformanceChart
          ref={chartRef}
          width={1200}
          height={520}
          className="landing-chart"
          maxPoints={ticker.maxSamples}
          backgroundColor={CHART_BACKGROUND}
          gridColor={CHART_GRID}
          lineColor={CHART_LINE}
        />
      </div>
    </section>
  );
});
