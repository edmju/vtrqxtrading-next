// src/app/(terminal)/dashboard/layout.tsx
import TopBar from "@/components/terminal/TopBar";
import Sidebar from "@/components/terminal/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TopBar />
      <div className="pt-16 mx-auto max-w-[1400px] px-4 grid grid-cols-[240px_1fr] gap-6">
        <aside>
          <Sidebar />
        </aside>
        <main className="min-h-[70vh]">{children}</main>
      </div>
    </div>
  );
}
