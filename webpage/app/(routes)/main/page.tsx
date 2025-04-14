import TransitionPage from "@/components/transition-page";

export default function Main() {
    return (
      <main>
        <TransitionPage />
        <div className="flex min-h-[100vh] h-full bg-no-repeat bg-gradient-cover">
        </div>
      </main>
    );
}