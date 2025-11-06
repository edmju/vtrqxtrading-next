export default function DashboardHome() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="terminal-panel">Welcome to VTRQX Terminal</div>
      <div className="terminal-panel">Pick a module: News, Sentiment, Macro, Dot Plots, Positioning</div>
    </div>
  );
}
