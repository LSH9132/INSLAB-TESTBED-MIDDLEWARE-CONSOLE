'use server';

import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'auth_token';

// This could be enhanced to use a cryptographically secure token,
// but for a simple single-password auth, a static valid string is sufficient
// as long as the cookie itself is secure and HttpOnly.
const VALID_TOKEN_VALUE = 'authenticated'; 

export async function loginWithPassword(formData: FormData) {
  const password = formData.get('password');
  // Use the environment variable, or default to 'inslab'
  const expectedPassword = process.env.ADMIN_PASSWORD || 'inslab';
  
  if (password === expectedPassword) {
    // Set cookie
    cookies().set({
      name: AUTH_COOKIE_NAME,
      value: VALID_TOKEN_VALUE,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // Expire in 30 days
      maxAge: 60 * 60 * 24 * 30,
    });
    
    return { success: true };
  }
  
  return { success: false, error: 'Invalid password' };
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
}
