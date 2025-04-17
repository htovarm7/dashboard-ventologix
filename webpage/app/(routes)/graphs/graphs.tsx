/*
 * @file page.tsx
 * @date 13/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file implements main page where the clients can see their graphs
 *
 * @version 1.0
*/


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