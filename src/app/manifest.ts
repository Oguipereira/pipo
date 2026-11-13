import type { MetadataRoute } from "next";

/** Permite adicionar o pipo à tela inicial e abrir como um app (sem barra do navegador). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pipo",
    short_name: "pipo",
    description: "Hábitos, código e projetos. Um quadradinho por dia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1014",
    theme_color: "#0d1014",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
