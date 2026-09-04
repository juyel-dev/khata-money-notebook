import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Khata — Simple Money Notebook",
    short_name: "Khata",
    description: "A simple offline money notebook for daily gave/took cash tracking.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7EF",
    theme_color: "#2F6B4F",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
