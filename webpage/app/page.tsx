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

import LoginButton from "@/components/login";
import TransitionPage from "@/components/transition-page";

export default function LoginPage() {
    return (
      <main>
        <TransitionPage />
        <div className="flex min-h-[100vh] h-full bg-no-repeat bg-gradient-cover">
          <LoginButton/>
        </div>
      </main>
    );
  }