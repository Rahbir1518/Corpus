import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Starfield from "@/app/components/Starfield";

export default async function Dashboard() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const currentTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden selection:bg-white/20 selection:text-white">
      <Starfield />

      {/* content layer */}
      <div className="relative z-10">
        <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link href="/" className="brand-link">
              <Image
                src="/assets/corpus_logo.png"
                alt="Corpus"
                width={64}
                height={64}
                className="brand-logo w-16 h-16"
                priority
              />
            </Link>
            <div>
              <h1 className="font-display text-2xl leading-none tracking-tight">Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {today} · {currentTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              {user.picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture as string}
                  alt={String(user.name || "User avatar")}
                  className="w-9 h-9 rounded-full border border-white/10"
                />
              )}
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{String(user.name || "User")}</span>
                <span className="text-xs text-muted-foreground">{String(user.email || "")}</span>
              </div>
            </div>
            <a
              href="/auth/logout"
              className="liquid-glass rounded-full px-5 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Logout
            </a>
          </div>
        </header>

        <section className="max-w-6xl mx-auto w-full px-6 pt-16 pb-24">
          <div className="animate-fade-rise">
            <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase mb-4">
              Your Corpus workspace
            </p>
            <h2 className="font-display text-5xl sm:text-6xl md:text-7xl tracking-[-2px] leading-[0.95]">
              {greeting},{" "}
              <em className="not-italic text-muted-foreground">
                {String(user.name || "there")}.
              </em>
            </h2>
            <p className="text-muted-foreground max-w-xl mt-6 text-lg animate-fade-rise-delay">
              Pick up exactly where you left off. Your portable memory is loaded and ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 animate-fade-rise-delay-2">
            <Link
              href="/projects"
              className="liquid-glass group rounded-3xl p-8 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-2xl">
                📁
              </div>
              <h3 className="text-xl font-medium mb-2">Projects</h3>
              <p className="text-muted-foreground text-sm">
                Select a project and browse its documents.
              </p>
            </Link>

            <Link
              href="/workflow"
              className="liquid-glass group rounded-3xl p-8 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-medium mb-2">Workflow</h3>
              <p className="text-muted-foreground text-sm">
                Explore your memory graph — nodes, edges, and token savings.
              </p>
            </Link>

            <a
              href="https://github.com/Rahbir1518/Corpus"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-glass group rounded-3xl p-8 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-2xl">
                📖
              </div>
              <h3 className="text-xl font-medium mb-2">Documentation</h3>
              <p className="text-muted-foreground text-sm">
                View the Corpus source and architecture docs.
              </p>
            </a>
          </div>

          <p className="text-xs text-muted-foreground/70 mt-20 uppercase tracking-[0.15em]">
            Powered by Corpus — cross-session, cross-tool project memory
          </p>
        </section>
      </div>
    </main>
  );
}
