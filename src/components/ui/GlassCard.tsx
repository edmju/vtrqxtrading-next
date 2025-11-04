import { ReactNode } from "react";

export default function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`neon-ring glass shadow-card ${className}`}>{children}</div>;
}
