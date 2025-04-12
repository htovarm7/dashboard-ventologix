/* This page shows the login page*/

import Login from "../components/login";
import TransitionPage from "@/components/transition-page";

export default function Home() {
  return (
    <main>
      <TransitionPage />
      <div className="flex min-h-[100vh] h-full bg-no-repeat bg-gradient-cover">
        <Login />
      </div>
    </main>
  );
}