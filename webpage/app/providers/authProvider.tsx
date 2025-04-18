"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { ReactNode } from "react";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <Auth0Provider
      domain={process.env.AUTH0_DOMAIN!}
      clientId={process.env.AUTH0_CLIENT!}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
      }}
    >
      {children}
    </Auth0Provider>
  );
};

export default AuthProvider;
