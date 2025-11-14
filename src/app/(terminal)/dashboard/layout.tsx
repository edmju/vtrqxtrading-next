// src/app/(terminal)/dashboard/layout.tsx

import TopBar from "@/components/terminal/TopBar";
import Sidebar from "@/components/terminal/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <TopBar />
      <div className="pt-16 mx-auto max-w-[1400px] px-4 grid grid-cols-[240px_minmax(0,1fr)] gap-6">
        <aside className="min-w-0">
          <Sidebar />
        </aside>
        <main className="min-h-[70vh] min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
