/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for the Docker standalone image used in CI/CD
  output: "standalone",
};

module.exports = nextConfig;
