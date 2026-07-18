import Link from "next/link";

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <div className="dashboard-welcome-card">
          <h2 className="dashboard-welcome-heading">Sign-in failed</h2>
          <p className="dashboard-welcome-text">
            {reason
              ? `Auth0 returned an error: "${reason}". Check the server logs for full details.`
              : "Something went wrong during sign-in. Check the server logs for full details."}
          </p>
          <Link href="/auth/login" className="btn btn-secondary">
            Try again
          </Link>
        </div>
      </main>
    </div>
  );
}
