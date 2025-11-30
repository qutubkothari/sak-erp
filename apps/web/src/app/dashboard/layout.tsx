import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Sidebar />
      <main className="flex-1 ml-72">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
