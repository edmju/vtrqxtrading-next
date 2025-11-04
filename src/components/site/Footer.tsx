export default function Footer() {
  return (
    <footer className="mt-16 pb-10">
      <div className="mx-auto max-w-7xl px-5">
        <div className="neon-ring glass rounded-xl2 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">© {new Date().getFullYear()} VTRQX Trading. All rights reserved.</p>
          <div className="text-xs text-white/60 flex gap-6">
            <a href="/terms" className="hover:text-primary">Terms</a>
            <a href="/privacy" className="hover:text-primary">Privacy</a>
            <a href="/contact" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
