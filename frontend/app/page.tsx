import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import LandingPage from "./components/landing-page";

export default async function Home() {
  const session = await auth0.getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}