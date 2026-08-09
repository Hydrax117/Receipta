/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Build-time environment validation
// ---------------------------------------------------------------------------
// Fail the build immediately in production if NEXT_PUBLIC_API_URL is missing.
// This catches misconfigured deployments before any traffic is served.
// The check is skipped in development so engineers can start without a
// .env.local file.
if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error(
      '[Receipta] NEXT_PUBLIC_API_URL is not set.\n' +
        'Set this variable in your deployment environment and re-run the build.\n' +
        'See frontend/.env.local.example for details.'
    );
  }
}

const nextConfig = {
  reactStrictMode: true,
  // Required for the Docker standalone image used in CI/CD
  output: 'standalone',
};

module.exports = nextConfig;
