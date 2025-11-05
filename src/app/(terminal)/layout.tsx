import type { ReactNode } from "react";
import TopBar from "@/components/terminal/TopBar";

export default function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="terminal-bg min-h-screen">
      <TopBar />
      <div className="pt-20 pb-8 mx-auto max-w-[1400px] px-4">
        <div className="terminal-frame">{children}</div>
      </div>
    </div>
  );
}
