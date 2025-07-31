'use client';

import { useAuth0 } from '@auth0/auth0-react';

export function useAuthUser() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  
  return {
    user,
    isAuthenticated,
    isLoading
  };
}