// apps/web/src/app/(public)/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ShieldCheck, Zap, BookOpen, ArrowRight } from 'lucide-react';
import { PublicNewsFeed } from '@/components/public/public-news-feed';

export default function PublicHomePage() {
  // Note: In a real multi-tenant setup, the schoolId might come from a subdomain or URL param.
  // For this implementation, we assume a default or platform-wide landing page.
  const defaultSchoolId = process.env.NEXT_PUBLIC_DEFAULT_SCHOOL_ID || 'demo-school-id';

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-24">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 text-blue-700 border-blue-200 bg-blue-50">
            🇰🇪 KDPA 2019 Compliant & AES-256 Encrypted
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            The Future of <span className="text-blue-600">School Management</span> is Here.
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            A unified, secure, and intelligent platform for academics, finance, boarding, and communication. Built specifically for the Kenyan education ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admissions">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                Apply for Admission <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-gray-300">
                Staff / Parent Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything Your School Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, title: 'Academic & CBT', desc: 'CBC-aligned grading, AI essay marking, and secure computer-based testing.' },
              { icon: ShieldCheck, title: 'Bank-Grade Security', desc: 'Role-based access, immutable audit logs, and encrypted PII/PHI.' },
              { icon: Zap, title: 'MPESA Integration', desc: 'Automated fee reconciliation via Daraja STK Push and Paybill.' },
              { icon: GraduationCap, title: 'Holistic Operations', desc: 'Library, transport, boarding, and clinic management in one place.' },
            ].map((feature, i) => (
              <Card key={i} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News / Announcements Feed (Calls Phase 10.5 Backend) */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Latest Announcements</h2>
              <p className="text-gray-600 mt-1">Stay updated with the latest news from the school.</p>
            </div>
            <Link href="/news">
              <Button variant="ghost">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          {/* This component fetches from /public/:schoolId/announcements */}
          <PublicNewsFeed schoolId={defaultSchoolId} limit={3} />
        </div>
      </section>
    </div>
  );
}