import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/en", permanent: false },
      { source: "/workflow", destination: "/en/workflow", permanent: false },
      { source: "/agents", destination: "/en/agents", permanent: false },
      { source: "/security", destination: "/en/security", permanent: false },
      { source: "/demo", destination: "/en/workspace", permanent: false },
      { source: "/workspace", destination: "/en/workspace", permanent: false },
      // The workspace used to live at /demo. Old links keep working.
      { source: "/:lang(en|zh)/demo", destination: "/:lang/workspace", permanent: false },
    ];
  },
};

export default nextConfig;
