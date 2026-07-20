// apps/web/src/app/(public)/layout.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogIn } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Public Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-700">
            <GraduationCap className="h-8 w-8" />
            <span>SMIS Portal</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-700 transition">Home</Link>
            <Link href="/news" className="hover:text-blue-700 transition">News & Announcements</Link>
            <Link href="/admissions" className="hover:text-blue-700 transition">Admissions</Link>
            <Link href="/gallery" className="hover:text-blue-700 transition">Gallery</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm">
                <LogIn className="mr-2 h-4 w-4" /> Staff/Parent Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 mt-16">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold flex items-center gap-2 mb-4">
              <GraduationCap className="h-6 w-6 text-blue-400" /> SMIS
            </h3>
            <p className="text-sm text-slate-400">
              Enterprise-grade School Management Information System. Empowering education through secure, compliant, and intelligent technology.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/admissions" className="hover:text-white transition">Apply for Admission</Link></li>
              <li><Link href="/news" className="hover:text-white transition">Latest News</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Parent Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Compliance & Security</h4>
            <p className="text-sm text-slate-400">
              Fully compliant with the Kenya Data Protection Act (KDPA) 2019. All student data is AES-256 encrypted at rest.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} SMIS Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}