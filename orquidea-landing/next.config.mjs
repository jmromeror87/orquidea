/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: import.meta.dirname },
  images: { qualities: [75, 100] },
};

export default nextConfig;
