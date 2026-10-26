import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El dominio acepta imágenes de hasta 5 MiB; se reserva margen para multipart.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
