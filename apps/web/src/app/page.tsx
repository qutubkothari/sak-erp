import Link from 'next/link';
import { ArrowRight, CheckCircle, Globe, Building2, Languages, Package, Factory } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] to-[#E8DCC4]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Factory className="h-8 w-8 text-[#8B6F47]" />
            <span className="text-2xl font-bold text-[#36454F]">SAK Solutions</span>
          </div>
          <Link 
            href="/login"
            className="px-6 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6F4E37] transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-[#36454F] mb-6">
            Manufacturing ERP System
          </h1>
          <p className="text-xl text-[#6F4E37] mb-8">
            Complete lifecycle management from procurement to after-sales service.
            Built for multi-tenant, multi-plant operations with comprehensive traceability.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/demo"
              className="inline-flex items-center px-8 py-3 bg-[#8B6F47] text-white rounded-lg hover:bg-[#6F4E37] transition-colors"
            >
              Request Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/docs"
              className="inline-flex items-center px-8 py-3 bg-white text-[#8B6F47] border-2 border-[#8B6F47] rounded-lg hover:bg-[#E8DCC4] transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <FeatureCard 
            icon={<Package className="h-10 w-10 text-[#8B6F47]" />}
            title="Assembly Tracking"
            description="Track every part through multiple workstations with hierarchical UID system"
          />
          <FeatureCard 
            icon={<Building2 className="h-10 w-10 text-[#8B6F47]" />}
            title="Multi-Plant Operations"
            description="Manage multiple manufacturing facilities, warehouses, and service centers"
          />
          <FeatureCard 
            icon={<Languages className="h-10 w-10 text-[#8B6F47]" />}
            title="Multi-Language Support"
            description="Built-in support for English, Hindi, Bengali, Telugu and more"
          />
        </div>

        {/* Modules Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-6xl mx-auto border border-[#E8DCC4]">
          <h2 className="text-3xl font-bold text-[#36454F] mb-8 text-center">
            Comprehensive Modules
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModuleItem title="Purchase Management" />
            <ModuleItem title="Inventory & Stores" />
            <ModuleItem title="Production Planning" />
            <ModuleItem title="Quality Control" />
            <ModuleItem title="Sales & Dispatch" />
            <ModuleItem title="After-Sales Service" />
            <ModuleItem title="Human Resources" />
            <ModuleItem title="R&D Management" />
            <ModuleItem title="Document Control" />
          </div>
        </div>

        {/* UID Tracking Section */}
        <div className="mt-16 bg-gradient-to-r from-[#8B6F47] to-[#6F4E37] rounded-2xl shadow-xl p-12 text-center text-white max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Complete Traceability with UID System
          </h2>
          <p className="text-xl text-[#E8DCC4] mb-6">
            Every part, subassembly, and finished product carries a unique identification number.
            Track the complete lifecycle from raw material to customer service.
          </p>
          <div className="inline-block bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg font-mono text-sm">
            Example UID: UID-SAK-KOL-RM-000001-A7
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-[#E8DCC4]">
        <div className="text-center text-[#6F4E37]">
          <p>&copy; 2025 SAK Solutions. All rights reserved.</p>
          <p className="mt-2">Enterprise Manufacturing ERP Solution</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-[#E8DCC4]">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[#36454F] mb-2">{title}</h3>
      <p className="text-[#6F4E37]">{description}</p>
    </div>
  );
}

function ModuleItem({ title }: { title: string }) {
  return (
    <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-[#FAF9F6] transition-colors">
      <CheckCircle className="h-5 w-5 text-[#6B8E23] flex-shrink-0" />
      <span className="text-[#36454F] font-medium">{title}</span>
    </div>
  );
}
