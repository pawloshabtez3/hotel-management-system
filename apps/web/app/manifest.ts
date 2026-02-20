import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Harborstay",
    short_name: "Harborstay",
    description: "Real-time hotel booking and room operations",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e7b6f",
    orientation: "portrait",
  };
}
