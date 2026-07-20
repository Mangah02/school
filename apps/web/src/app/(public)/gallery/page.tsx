// apps/web/src/app/(public)/gallery/page.tsx
import { Card } from '@/components/ui/card';

export default function GalleryPage() {
  // Mocked gallery data (In production, fetch from MinIO public bucket)
  const images = [
    { id: 1, url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', caption: 'Science Fair 2025' },
    { id: 2, url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', caption: 'Library Reading Hour' },
    { id: 3, url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', caption: 'Sports Day' },
    { id: 4, url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', caption: 'Classroom Learning' },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">School Gallery</h1>
      <p className="text-gray-600 mb-10">Glimpses of life, learning, and achievements at our school.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map(img => (
          <Card key={img.id} className="overflow-hidden group cursor-pointer">
            <div className="aspect-video overflow-hidden">
              <img src={img.url} alt={img.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-4 bg-white">
              <p className="font-medium text-gray-800">{img.caption}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}