import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const domain = process.env.AUTH0_DOMAIN
const client = process.env.AUTH0_CLIENT


const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  return <button onClick={() => loginWithRedirect()}>Log In</button>;
};

export default LoginButton;