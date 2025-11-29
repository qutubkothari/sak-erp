import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Sidebar />
      <main className="flex-1 transition-all duration-300" style={{ marginLeft: '0' }}>
        <div className="pt-16">
          {children}
        </div>
      </main>
    </div>
  );
}
