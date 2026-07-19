"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("in-view");
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/* ───────── Terminal demo: /corpus_remembers + /corpus_recalls ───────── */

type Line = {
  who: "user" | "corpus";
  text: string;
  mono?: boolean;
};

const SCRIPT: Line[] = [
  { who: "user", text: "/corpus_remembers", mono: true },
  {
    who: "corpus",
    text: "Saved 3 decisions, 2 open threads → engram written (812 tokens)",
  },
  { who: "user", text: "/corpus_recalls webhook bug", mono: true },
  {
    who: "corpus",
    text: "Loaded 2 relevant nodes — auth-decision, webhook-bug. Context restored.",
  },
];

const TYPE_SPEED = 38; // ms per character
const HOLD_AFTER_LINE = 900; // pause after a line finishes
const HOLD_BEFORE_LOOP = 2200; // pause on full transcript before resetting

function CorpusTerminal() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [committed, setCommitted] = useState<Line[]>([]);

  useEffect(() => {
    if (lineIndex >= SCRIPT.length) {
      const resetTimer = setTimeout(() => {
        setCommitted([]);
        setLineIndex(0);
        setCharIndex(0);
      }, HOLD_BEFORE_LOOP);
      return () => clearTimeout(resetTimer);
    }

    const current = SCRIPT[lineIndex];

    if (charIndex < current.text.length) {
      const typeTimer = setTimeout(() => {
        setCharIndex((c) => c + 1);
      }, TYPE_SPEED);
      return () => clearTimeout(typeTimer);
    }

    const advanceTimer = setTimeout(() => {
      setCommitted((prev) => [...prev, current]);
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, HOLD_AFTER_LINE);
    return () => clearTimeout(advanceTimer);
  }, [lineIndex, charIndex]);

  const activeLine = lineIndex < SCRIPT.length ? SCRIPT[lineIndex] : null;
  const activeText = activeLine ? activeLine.text.slice(0, charIndex) : "";
  const isTypingUser = activeLine?.who === "user" && charIndex < activeLine.text.length;

  return (
    <div className="liquid-glass rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden w-full max-w-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
        <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
        <span className="w-3 h-3 rounded-full bg-[#eab308]" />
        <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
        <span className="ml-3 text-xs font-mono text-muted-foreground tracking-wide">
          corpus — mcp
        </span>
      </div>

      {/* transcript */}
      <div className="px-5 py-6 font-mono text-[13px] leading-relaxed min-h-[220px] flex flex-col gap-3">
        {committed.map((line, i) => (
          <TerminalLine key={i} line={line} text={line.text} caret={false} />
        ))}

        {activeLine && (
          <TerminalLine
            line={activeLine}
            text={activeText}
            caret={isTypingUser}
            thinking={activeLine.who === "corpus" && activeText.length === 0}
          />
        )}
      </div>
    </div>
  );
}

function TerminalLine({
  line,
  text,
  caret,
  thinking,
}: {
  line: Line;
  text: string;
  caret: boolean;
  thinking?: boolean;
}) {
  if (line.who === "user") {
    return (
      <div className="flex items-start gap-2 text-white/90">
        <span className="text-white/40 select-none">$</span>
        <span>
          {text}
          {caret && <span className="inline-block w-[7px] h-[14px] bg-white/70 ml-0.5 align-middle animate-pulse" />}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="text-[hsl(240,6%,50%)] select-none">→</span>
      {thinking ? (
        <span className="inline-flex gap-1 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:300ms]" />
        </span>
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-background text-foreground min-h-screen selection:bg-white/20 selection:text-white">
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 ${scrolled ? "liquid-glass bg-background/50 border-b border-white/5" : "bg-transparent"
          }`}
      >
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-display text-3xl tracking-tight">
            <Image
              src="/assets/corpus_logo.png"
              alt="Corpus"
              width={60}
              height={60}
              className="brand-logo w-14 h-14"
              priority
            />
            Corpus
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#overview" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Overview</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#graph" className="text-sm text-muted-foreground hover:text-foreground transition-colors">The Graph</a>
          <a href="#pitch" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pitch</a>
        </div>

        <Link
          href="/auth/login"
          className="liquid-glass rounded-full px-6 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/40 mix-blend-multiply z-[1]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-[2]"></div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] animate-fade-rise">
            Your AI <em className="not-italic text-muted-foreground">forgets everything</em> the moment you <em className="not-italic text-muted-foreground">switch tabs.</em>
          </h1>

          <p className="text-muted-foreground max-w-2xl mt-8 text-lg sm:text-xl animate-fade-rise-delay">
            Give your AI a portable memory. One lightweight file that any model can read, so it never has to re-learn your work, and you stop paying for redundant context.
          </p>

          <div className="mt-12 animate-fade-rise-delay-2">
            <Link
              href="/auth/login?screen_hint=signup"
              className="liquid-glass rounded-full px-14 py-5 text-lg font-medium inline-block hover:bg-white/10 transition-all hover:scale-105"
            >
              Start Remembering
            </Link>
          </div>
        </div>
      </section>

      <section id="overview" className="py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-6xl tracking-tight mb-8">
              The Goldfish Problem
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Every time you open a new chat, you start from scratch. You spend the first ten minutes just re-explaining the context, your preferences, and what you accomplished last time. It&apos;s frustrating, expensive, and a colossal waste of time. Corpus fixes this.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="how-it-works" className="py-32 px-6 bg-background relative z-10">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-6xl tracking-tight mb-16 text-center">
              How it works
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Reveal delay={0}>
              <div className="liquid-glass p-8 rounded-3xl h-full border border-white/5 bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m8 17 4-4 4 4"></path></svg>
                </div>
                <h3 className="text-xl font-medium mb-3">Capture</h3>
                <p className="text-muted-foreground text-sm">Automatically extract the most critical insights and context from your conversations.</p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="liquid-glass p-8 rounded-3xl h-full border border-white/5 bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <h3 className="text-xl font-medium mb-3">Summarize</h3>
                <p className="text-muted-foreground text-sm">Condense sprawling threads into structured, dense knowledge artifacts.</p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="liquid-glass p-8 rounded-3xl h-full border border-white/5 bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <h3 className="text-xl font-medium mb-3">Store</h3>
                <p className="text-muted-foreground text-sm">Persist your AI&apos;s memory in a vendor-neutral, portable format that you own entirely.</p>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="liquid-glass p-8 rounded-3xl h-full border border-white/5 bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"></path></svg>
                </div>
                <h3 className="text-xl font-medium mb-3">Load</h3>
                <p className="text-muted-foreground text-sm">Instantly inject context into any new session. Pick up exactly where you left off.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="graph" className="py-32 px-6 relative z-10 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <h2 className="font-display text-5xl sm:text-7xl tracking-tight mb-8">
              The Memory Graph
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-16">
              Your memory isn&apos;t a list; it&apos;s a web. Corpus connects related ideas as nodes and edges. When your AI retrieves a piece of context, it pulls the surrounding conceptual neighborhood with it.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="relative aspect-video rounded-3xl liquid-glass overflow-hidden flex items-center justify-center border border-white/10 bg-white/[0.01]">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.5
              }}></div>

              {/* Abstract Graph Representation */}
              <div className="relative z-10 w-full h-full p-8 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Center Node */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse">
                    <span className="text-xs font-mono">Core</span>
                  </div>

                  {/* Surrounding Nodes */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"></div>
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"></div>
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"></div>

                  {/* Edges */}
                  <svg className="absolute inset-0 w-full h-full -z-10" style={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, fill: 'none', strokeDasharray: '4 4' }}>
                    <line x1="128" y1="128" x2="128" y2="20" />
                    <line x1="128" y1="128" x2="128" y2="236" />
                    <line x1="128" y1="128" x2="20" y2="128" />
                    <line x1="128" y1="128" x2="236" y2="128" />
                  </svg>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer id="pitch" className="relative pt-32 pb-10 px-6 border-t border-white/5 z-10 bg-background overflow-hidden flex flex-col">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-bottom opacity-50"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 100%)",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 100%)",
          }}
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10 max-w-6xl mx-auto w-full mb-24 mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div>
                <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase mb-4">
                  Two tools. That&apos;s the whole interface.
                </p>
                <h2 className="font-display text-4xl sm:text-6xl tracking-tight mb-8">
                  Two commands. Total recall.
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                  Corpus ships as a pair of MCP tools any agent can call.{" "}
                  <code className="font-mono text-base text-foreground bg-white/10 px-1.5 py-0.5 rounded">corpus_remembers</code>{" "}
                  writes the current session down as a portable engram. {" "}
                  <code className="font-mono text-base text-foreground bg-white/10 px-1.5 py-0.5 rounded">corpus_recalls</code>{" "}
                  pulls only the nodes relevant to what you&apos;re doing right now back into context.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-10">
                  No dashboards, no config files to maintain. Your agent just calls the tool, the same way it calls any other function.
                </p>
                <Link
                  href="/auth/login?screen_hint=signup"
                  className="liquid-glass rounded-full px-14 py-5 text-lg font-medium inline-block hover:bg-white/10 transition-all hover:scale-105"
                >
                  Start Remembering
                </Link>
              </div>
            </Reveal>

            <Reveal delay={150} className="flex justify-center lg:justify-end">
              <CorpusTerminal />
            </Reveal>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto w-full mt-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-10 border-b border-white/5">
            <div>
              <p className="flex items-center gap-2 font-display text-3xl tracking-tight mb-3">
                <Image
                  src="/assets/corpus_logo.png"
                  alt="Corpus"
                  width={56}
                  height={56}
                  className="brand-logo w-[52px] h-[52px]"
                />
                Corpus
              </p>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                A portable memory layer for every model you use.
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <a href="#overview" className="hover:text-foreground transition-colors">Overview</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#graph" className="hover:text-foreground transition-colors">The Graph</a>
              <a href="#pitch" className="hover:text-foreground transition-colors">Pitch</a>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Corpus. All rights reserved.</p>
            <p className="uppercase tracking-[0.15em]">Never explain yourself twice</p>
          </div>
        </div>
      </footer>
    </main>
  );
}