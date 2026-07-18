import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import Workspace from "./Workspace";

export default async function WorkflowPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-background/60 backdrop-blur-xl z-20">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="font-display text-3xl tracking-tight">
            Corpus<sup className="text-xs">®</sup>
          </Link>
          <span className="text-sm text-muted-foreground hidden sm:inline">Memory graph</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="liquid-glass rounded-full px-6 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>
      <Workspace />
    </div>
  );
}
