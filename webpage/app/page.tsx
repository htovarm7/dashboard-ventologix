/*
 * @file page.tsx
 * @date 13/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file shows the login page of the application.
 *
 * @version 1.0
*/

"use client"

import LoginAuth from "@/components/loginAuth";
import Login from "@/components/login";
import TransitionPage from "@/components/transition-page";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleNavigate = () => {
    router.push("/graphsD");
  };

  return (
    <main>
      <TransitionPage />
      <div className="flex min-h-[100vh] h-full bg-no-repeat bg-gradient-cover">
        {/* <Login/> */}
        <button
          onClick={handleNavigate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Graphs
        </button>
      </div>
    </main>
  );
}