/**
 * Minimal auth placeholder for Phase 0.
 * Phase 6+: Replace with Auth.js (NextAuth) real authentication.
 *
 * Current: single-user local mode — always returns the dev user.
 * All API routes use this to identify the current user.
 */

export const DEV_USER_ID = 'dev-user';

export function getCurrentUserId(): string {
  // Phase 0–5: single-user mode with fixed dev user
  // Phase 6+: read from session / JWT cookie
  return DEV_USER_ID;
}
