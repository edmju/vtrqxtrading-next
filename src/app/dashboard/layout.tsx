import type { ReactNode } from "react";
import DashboardNav from "@/components/site/DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="neon-ring glass p-4 h-fit sticky top-24">
        <DashboardNav />
      </aside>
      <section>{children}</section>
    </div>
  );
}
