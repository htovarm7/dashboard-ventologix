import React from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';

const root = createRoot(document.getElementById('root'));

const client = process.env.AUTH0_CLIENT;
const domain = process.env.AUTH0_DOMAIN;

root.render(
<Auth0Provider
    domain={domain}
    clientId={client}
    authorizationParams={{
      redirect_uri: window.location.origin
    }}
  >
    <App />
  </Auth0Provider>,
);