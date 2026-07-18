// apps/web/src/app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'School Management Information System (SMIS)',
    short_name: 'SMIS',
    description: 'Enterprise-grade School Management System for Kenya',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb', // Blue-600
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192x192.png', // Ensure you add these to public/icons/
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}