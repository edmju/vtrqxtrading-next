import type { ReactNode } from "react";
import DashboardNav from "@/components/site/DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      <aside className="terminal-panel sticky top-24 h-fit p-4">
        <DashboardNav />
      </aside>
      <section className="space-y-6">{children}</section>
    </div>
  );
}
