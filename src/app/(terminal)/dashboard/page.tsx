// src/app/(terminal)/dashboard/page.tsx
export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div className="terminal-panel text-center py-8 text-lg">
        Welcome to VTRQX Terminal
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="terminal-panel text-center py-6">
          Pick a module: News, Sentiment, Macro, Dot Plots, Positioning
        </div>
        <div className="terminal-panel text-center py-6">
          Use the left sidebar to navigate
        </div>
      </div>
    </div>
  );
}
