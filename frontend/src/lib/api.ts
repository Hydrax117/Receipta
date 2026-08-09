/**
 * lib/api.ts — single source of truth for the backend base URL.
 *
 * Import `apiUrl` wherever a fetch call needs the backend origin.
 * Never inline NEXT_PUBLIC_API_URL in page components — use this instead.
 *
 * Rules:
 *  - In production builds NEXT_PUBLIC_API_URL must be defined.
 *    next.config.js enforces this at build time; this module enforces it
 *    at runtime as a second line of defence.
 *  - In development the variable defaults to http://localhost:3001 so
 *    engineers can start working without creating a .env.local first.
 */

const ENV_VAR = 'NEXT_PUBLIC_API_URL';

function resolveApiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;

  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[Receipta] ${ENV_VAR} is not set. ` +
          'Add it to your deployment environment variables and rebuild.'
      );
    }
    // Development-only convenience default — never reaches production.
    return 'http://localhost:3001';
  }

  // Strip a trailing slash so callers can always write `${apiUrl}/api/…`
  return value.replace(/\/$/, '');
}

/**
 * The backend base URL, e.g. "https://api.receipta.app".
 * Resolved once at module-load time so every import shares the same value.
 */
export const apiUrl = resolveApiUrl();
