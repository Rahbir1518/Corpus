# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo-style layout with a single active package. All application code lives in [frontend/](frontend/) — a Next.js app. Run all commands from `frontend/`, not the repo root.

## Commands

```bash
cd frontend
npm install        # install dependencies
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint (flat config, eslint-config-next)
```

There is no test setup yet. TypeScript is checked as part of `next build` (no standalone typecheck script).

## Environment

Auth0 requires a `frontend/.env.local` with: `APP_BASE_URL`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (see [frontend/README.md](frontend/README.md)). Nothing runs without these — the Auth0 middleware reads them at startup.

## Architecture

Next.js 16 (App Router) + React 19 + Tailwind CSS v4, TypeScript. Path alias `@/*` maps to the `frontend/` root (e.g. `@/lib/auth0`).

**Auth is the spine of the app.** Everything flows through `@auth0/nextjs-auth0` v4:

- [frontend/lib/auth0.ts](frontend/lib/auth0.ts) exports a single shared `auth0` client. Import it everywhere rather than constructing a new one.
- [frontend/proxy.ts](frontend/proxy.ts) is the Next.js middleware (Next 16 renamed `middleware.ts` → `proxy.ts`). It runs `auth0.middleware` on every request except static assets. This middleware **auto-mounts the `/auth/*` routes** (`/auth/login`, `/auth/logout`, `/auth/callback`, etc.) — there are no route files for these; they exist because the middleware handles them. Links like `/auth/login?screen_hint=signup` rely on this.
- Access control is per-page in **server components** via `await auth0.getSession()`, then `redirect()`. The public landing page ([app/page.tsx](frontend/app/page.tsx)) redirects authenticated users to `/dashboard`; protected pages ([app/(dashboard)/dashboard/page.tsx](frontend/app/(dashboard)/dashboard/page.tsx)) redirect unauthenticated users to `/auth/login`. Follow this same guard pattern when adding pages rather than relying on middleware alone for gating.

**Routing:** App Router with route groups (e.g. `(dashboard)` groups routes without adding a URL segment). Note the dashboard links to `/workflow`, which does not exist yet.

**Styling:** Global CSS classes in [app/globals.css](frontend/app/globals.css) (semantic names like `landing-card`, `dashboard-header`) alongside Tailwind v4 (via `@tailwindcss/postcss`). Fonts are Geist / Geist Mono from `next/font/google`.
