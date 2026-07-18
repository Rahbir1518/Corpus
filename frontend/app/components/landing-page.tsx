"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

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
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 ${
          scrolled ? "liquid-glass bg-background/50 border-b border-white/5" : "bg-transparent"
        }`}
      >
        <div className="flex items-center gap-2">
          <Link href="/" className="font-display text-3xl tracking-tight">
            Corpus<sup className="text-xs">®</sup>
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
                  <svg className="absolute inset-0 w-full h-full -z-10" style={{stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, fill: 'none', strokeDasharray: '4 4'}}>
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

      <section id="pitch" className="py-40 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="font-display text-5xl sm:text-7xl tracking-tight mb-8">
              Never explain yourself twice.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-12">
              <Link
                href="/auth/login?screen_hint=signup"
                className="liquid-glass rounded-full px-14 py-5 text-lg font-medium inline-block hover:bg-white/10 transition-all hover:scale-105"
              >
                Start Remembering
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/5 text-center text-sm text-muted-foreground relative z-10 bg-background">
        <p>&copy; {new Date().getFullYear()} Corpus. All rights reserved.</p>
      </footer>
    </main>
  );
}
