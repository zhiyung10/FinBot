import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Set basePath if deploying to github.com/username/repo-name (not custom domain)
  // basePath: "/your-repo-name",
};

export default nextConfig;
