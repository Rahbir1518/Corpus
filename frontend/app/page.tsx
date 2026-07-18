import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth0.getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="landing-container">
      <div className="landing-glow landing-glow-1" />
      <div className="landing-glow landing-glow-2" />

      <main className="landing-card">
        <div className="landing-logo">C</div>
        <h1 className="landing-title">Corpus</h1>
        <p className="landing-subtitle">
          Your intelligent workspace for structured knowledge.
        </p>

        <div className="landing-buttons">
          <a href="/auth/login" className="btn btn-primary">
            Sign In
          </a>
          <a
            href="/auth/login?screen_hint=signup"
            className="btn btn-secondary"
          >
            Sign Up
          </a>
        </div>
      </main>
    </div>
  );
}