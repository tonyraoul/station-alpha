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
  label: string;
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

const MarkdownContent = memo(function MarkdownContent({
  content,
}: {
  content: string;
}): JSX.Element {
  return (
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
        {content}
      </ReactMarkdown>
    </div>
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
        label: "Q1",
        content: q1Doc,
      },
      {
        id: "q2",
        title: "Question 2 Answer",
        subtitle: "Trade replay feature with integrity-first architecture",
        label: "Q2",
        content: q2Doc,
      },
      {
        id: "consolidated-calc",
        title: "Consolidation: Multi-Resolution Calculation",
        subtitle: "Rollup math, pipeline behavior, and recovery patterns",
        label: "CALC",
        content: consolidatedCalc,
      },
      {
        id: "consolidated-services",
        title: "Consolidation: Service Interactions",
        subtitle: "Backend and frontend package interaction blueprints",
        label: "FLOW",
        content: consolidatedService,
      },
    ],
    [],
  );

  const q1Section = docs[0];
  const q2Section = docs[1];
  const remainingSections = docs.slice(2);
  const timelineLabels = useMemo(
    () => [
      "Hero",
      "Summary",
      "Chart Demo",
      `${q1Section.label} Title`,
      `${q1Section.label} Answer`,
      `${q2Section.label} Title`,
      `${q2Section.label} Answer`,
      ...remainingSections.flatMap((doc) => [
        `${doc.label} Title`,
        `${doc.label} Answer`,
      ]),
    ],
    [q1Section, q2Section, remainingSections],
  );

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Scroll progress rail (always active)
      gsap.fromTo(
        ".scroll-timeline-progress",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".landing",
            start: "top top",
            end: "bottom bottom",
            scrub: 0.45,
          },
        },
      );

      if (reducedMotion) return;

      // ── Orb ambient float
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

      // ── Hero: bold minimalism — clip-wrap slide-up reveals
      gsap.from(".hero-kicker", {
        autoAlpha: 0,
        y: 18,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(".hero-title-line", {
        y: "110%",
        duration: 1.1,
        stagger: 0.15,
        ease: "power4.out",
        delay: 0.1,
      });
      gsap.from(".hero-subtitle", {
        autoAlpha: 0,
        y: 22,
        duration: 0.8,
        delay: 0.55,
        ease: "power3.out",
      });
      gsap.from(".hero-action", {
        autoAlpha: 0,
        y: 18,
        scale: 0.9,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.7,
        ease: "back.out(1.7)",
      });
      // Hero scroll-exit: parallax drift (scrollytelling)
      gsap.to(".hero", {
        y: -60,
        autoAlpha: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "bottom 80%",
          end: "bottom 10%",
          scrub: 1,
        },
      });

      // ── Summary: staggered batch from alternating directions
      gsap.from(".summary-section .section-headline", {
        autoAlpha: 0,
        x: -24,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".summary-section",
          start: "top 82%",
          once: true,
        },
      });
      gsap.from(".summary-title", {
        y: "110%",
        duration: 0.9,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ".summary-section",
          start: "top 82%",
          once: true,
        },
      });
      const summaryRects = gsap.utils.toArray<HTMLElement>(".summary-rect");
      const summaryFrom: Array<{ x?: number; y?: number; autoAlpha: number }> =
        [
          { x: -64, autoAlpha: 0 },
          { y: 60, autoAlpha: 0 },
          { x: 64, autoAlpha: 0 },
        ];
      summaryRects.forEach((card, i) => {
        gsap.from(card, {
          ...(summaryFrom[i] ?? { y: 40, autoAlpha: 0 }),
          duration: 0.85,
          ease: "power3.out",
          delay: i * 0.1,
          scrollTrigger: {
            trigger: ".summary-grid",
            start: "top 82%",
            once: true,
          },
        });
      });

      // ── Chart: meta rotateX stagger + clip-path wipe reveal
      gsap.from(".chart-meta > div", {
        y: 28,
        autoAlpha: 0,
        rotateX: 30,
        transformOrigin: "top center",
        stagger: 0.07,
        duration: 0.65,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".chart-meta",
          start: "top 86%",
          once: true,
        },
      });
      gsap.from(".chart-wrap", {
        clipPath: "inset(100% 0 0 0)",
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: {
          trigger: ".chart-zone",
          start: "top 80%",
          once: true,
        },
      });
      gsap.to(".chart-wrap", {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: ".chart-zone",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // ── Q1 title: per-element stagger reveals (teal accent section)
      gsap.from("#q1-title .question-title-kicker", {
        autoAlpha: 0,
        y: 14,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#q1-title",
          start: "top 82%",
          once: true,
        },
      });
      gsap.from("#q1-title .clip-wrap > h2", {
        y: "110%",
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "#q1-title",
          start: "top 82%",
          once: true,
        },
      });
      gsap.from("#q1-title .question-title-panel > p:last-child", {
        autoAlpha: 0,
        y: 16,
        duration: 0.7,
        delay: 0.28,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#q1-title",
          start: "top 82%",
          once: true,
        },
      });

      // ── Q1 answer: 3D card-flip entrance
      gsap.from("#q1 .answer-panel", {
        y: 70,
        autoAlpha: 0,
        rotateX: 6,
        transformOrigin: "top center",
        duration: 0.95,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "#q1",
          start: "top 85%",
          once: true,
        },
      });

      // ── Q2 title: cinematic horizontal entry from right + blur (contrasts Q1 per-element reveals)
      gsap.from("#q2-title .question-title-panel", {
        x: 80,
        autoAlpha: 0,
        filter: "blur(6px)",
        duration: 1,
        ease: "expo.out",
        scrollTrigger: {
          trigger: "#q2-title",
          start: "top 80%",
          once: true,
        },
      });

      // ── Q2 answer: scale-fade with blur clearance
      gsap.from("#q2 .answer-panel", {
        y: 60,
        autoAlpha: 0,
        scale: 0.97,
        filter: "blur(4px)",
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#q2",
          start: "top 85%",
          once: true,
        },
      });

      // ── Remaining compact sections: batch reveal
      gsap.utils
        .toArray<HTMLElement>(
          ".question-title-section.is-compact .question-title-panel",
        )
        .forEach((panel) => {
          gsap.from(panel, {
            y: 44,
            autoAlpha: 0,
            scale: 0.97,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              start: "top 84%",
              once: true,
            },
          });
        });
      gsap.utils
        .toArray<HTMLElement>(
          ".question-answer-section.is-compact .answer-panel",
        )
        .forEach((panel) => {
          gsap.from(panel, {
            y: 60,
            autoAlpha: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              start: "top 85%",
              once: true,
            },
          });
        });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  // Custom cursor: smooth lerp follower (desktop/mouse pointer only)
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const cursor = document.querySelector<HTMLElement>(".cursor");
    if (!cursor) return;

    let mx = 0,
      my = 0,
      cx = 0,
      cy = 0;
    let rafId = 0;
    let started = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!started) {
        cx = mx;
        cy = my;
        started = true;
        cursor.classList.add("cursor--active");
      }
    };

    const tick = () => {
      cx += (mx - cx) * 0.1;
      cy += (my - cy) * 0.1;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    const hoverEls = document.querySelectorAll<HTMLElement>(
      "a, button, .summary-rect, .doc-card",
    );
    const enter = () => cursor.classList.add("cursor--hover");
    const leave = () => cursor.classList.remove("cursor--hover");
    hoverEls.forEach((el) => {
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
    });

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      hoverEls.forEach((el) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
    };
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <div className="cursor" aria-hidden="true" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <aside className="scroll-timeline" aria-hidden="true">
        <div className="scroll-timeline-track">
          <div className="scroll-timeline-progress" />
        </div>
        <div className="scroll-timeline-labels">
          {timelineLabels.map((label) => (
            <span key={label} className="scroll-timeline-label">
              {label}
            </span>
          ))}
        </div>
      </aside>

      <HeroSection />
      <SummarySection />
      <LiveChartSection />

      <QuestionTitleSection doc={q1Section} />
      <QuestionAnswerSection doc={q1Section} />

      <QuestionTitleSection doc={q2Section} />
      <QuestionAnswerSection doc={q2Section} />

      {remainingSections.map((doc) => (
        <section key={doc.id} className="docs-grid sequence-section">
          <QuestionTitleSection doc={doc} compact />
          <QuestionAnswerSection doc={doc} compact />
        </section>
      ))}
    </div>
  );
}

const HeroSection = memo(function HeroSection(): JSX.Element {
  return (
    <header className="hero sequence-section">
      <p className="hero-kicker">Station Alpha • Screening Task</p>
      <h1 className="hero-title">
        <span className="clip-wrap">
          <span className="hero-title-line">Realtime Market</span>
        </span>
        <span className="clip-wrap">
          <span className="hero-title-line">Infrastructure</span>
        </span>
        <span className="clip-wrap">
          <span className="hero-title-line">Crafted for Replay</span>
        </span>
      </h1>
      <p className="hero-subtitle">
        Live WebGL charting, integrity-first replay architecture, and
        multi-resolution data strategy in one cinematic landing page.
      </p>
      <div className="hero-actions">
        <a className="hero-action hero-action-primary" href="#q1-title">
          Question 1
        </a>
        <a className="hero-action hero-action-secondary" href="#q2-title">
          Question 2
        </a>
      </div>
    </header>
  );
});

const SummarySection = memo(function SummarySection(): JSX.Element {
  return (
    <section
      className="summary-section sequence-section"
      aria-labelledby="summary-title"
    >
      <div className="section-headline">Summary</div>
      <div className="clip-wrap">
        <h2 id="summary-title" className="summary-title">
          What you are about to explore
        </h2>
      </div>
      <div className="summary-grid">
        <article className="summary-rect">
          <h3>Backend architecture</h3>
          <p>
            Streaming ingestion, resilient processing, and replay-safe
            persistence form the core service layer.
          </p>
        </article>
        <article className="summary-rect">
          <h3>Frontend architecture</h3>
          <p>
            React + GSAP sequencing, markdown-driven sections, and high-focus
            content choreography.
          </p>
        </article>
        <article className="summary-rect">
          <h3>Demo chart component</h3>
          <p>
            A WebGL chart showcasing high-frequency updates, smooth rendering,
            and incremental data streaming.
          </p>
        </article>
      </div>
    </section>
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
    <section className="hero-glass chart-zone sequence-section">
      <div className="section-headline">Chart Demo</div>
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

const QuestionTitleSection = memo(function QuestionTitleSection({
  doc,
  compact = false,
}: {
  doc: DocSection;
  compact?: boolean;
}): JSX.Element {
  return (
    <section
      id={`${doc.id}-title`}
      className={`question-title-section sequence-section ${compact ? "is-compact" : ""}`.trim()}
    >
      <div className="question-title-panel">
        <p className="question-title-kicker">{doc.label}</p>
        <div className="clip-wrap">
          <h2>{doc.title}</h2>
        </div>
        <p>{doc.subtitle}</p>
      </div>
    </section>
  );
});

const QuestionAnswerSection = memo(function QuestionAnswerSection({
  doc,
  compact = false,
}: {
  doc: DocSection;
  compact?: boolean;
}): JSX.Element {
  return (
    <section
      id={doc.id}
      className={`question-answer-section sequence-section ${compact ? "is-compact" : ""}`.trim()}
    >
      <article className="doc-card answer-panel">
        <h3>{doc.title}</h3>
        <p className="doc-subtitle">{doc.subtitle}</p>
        <MarkdownContent content={doc.content} />
      </article>
    </section>
  );
});
