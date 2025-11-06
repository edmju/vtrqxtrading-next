import TopBar from "@/components/terminal/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TopBar />
      <div className="pt-16 max-w-[1400px] mx-auto px-4">{children}</div>
    </div>
  );
}
