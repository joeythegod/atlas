import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/atlas",
  images: { unoptimized: true },
};

export default nextConfig;
