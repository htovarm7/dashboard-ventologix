'use client';

import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { loadEnvFile } from 'process';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || ''}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || ''}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : '',
      }}
      onRedirectCallback={(appState) => {
        router.push(appState?.returnTo || '/');
      }}
    >
      {children}
    </Auth0Provider>
  );
}
