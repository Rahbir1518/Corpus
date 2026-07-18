import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  async onCallback(error, ctx) {
    const appBaseUrl = ctx.appBaseUrl || process.env.APP_BASE_URL || "http://localhost:3000";

    if (error) {
      console.error("[auth0 callback error]", {
        code: error.code,
        message: error.message,
        cause: error.cause,
      });
      return NextResponse.redirect(
        new URL(`/auth/login-error?reason=${error.code}`, appBaseUrl)
      );
    }

    return NextResponse.redirect(new URL(ctx.returnTo || "/dashboard", appBaseUrl));
  },
});
