import { Amplify } from 'aws-amplify';
import 'aws-amplify/auth/enable-oauth-listener';
import { getCurrentUser, signInWithRedirect, signOut, fetchAuthSession } from 'aws-amplify/auth';

const CLOUDFRONT = 'https://d3261u1h39xawq.cloudfront.net/';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_gaSGBrRy9',
      userPoolClientId: '5mbpotrbg7n3d7op8os4nlq8cl',
      loginWith: {
        oauth: {
          domain: 'us-east-1gasgbrry9.auth.us-east-1.amazoncognito.com',
          scopes: ['openid', 'email'],
          redirectSignIn: [CLOUDFRONT],
          redirectSignOut: [CLOUDFRONT],
          responseType: 'code',
        },
      },
    },
  },
});

export async function obtenerUsuario() {
  try { return await getCurrentUser(); }
  catch { return null; }
}
export async function iniciarSesion() { return signInWithRedirect(); }
export async function cerrarSesion() { return signOut(); }
export async function obtenerToken() {
  const sesion = await fetchAuthSession();
  return sesion.tokens?.accessToken?.toString();
}
