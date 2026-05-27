/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false, // Menghilangkan indikator prerender
    buildActivity: false, // Menghilangkan indikator build (logo n/turbopack)
  },
};

export default nextConfig;
